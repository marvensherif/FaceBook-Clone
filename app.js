const express = require("express");
const bodyParser = require("body-parser");
const multer = require('multer')
const mongoose = require("mongoose");
const _ = require("lodash");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary");
const cloudinaryStorage = require("multer-storage-cloudinary");
const app = express();
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require("passport-local-mongoose");
const pusher = require("pusher");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const expressValidator = require("express-validator");
const flash = require("connect-flash");
const foo = [];


dotenv.config();
let x = {
  post: "welcome to magic-Wand"
};

const posts = [];

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});




mongoose.connect("mongodb://localhost:27017/socialMedia", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
mongoose.set('useCreateIndex', true);



cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

const storage = cloudinaryStorage({
  cloudinary: cloudinary,
  folder: "Uploaded-images",
  allowedFormats: ["jpg", "png"],
  transformation: [{
    width: 500,
    height: 500,
    crop: "limit"
  }]
});
const parser = multer({
  storage: storage
});



const registerSchema = new mongoose.Schema({
  fname: String,
  lname: String,
  email: String,
  pass: String,
  phone: String,
  hometown: String,
  date: String,
  gender: String,
  status: String,
  Bio: String,
  imgURL: String,
  imgID: String

});
registerSchema.plugin(passportLocalMongoose);

const Userinformation = mongoose.model("Userinformation", registerSchema);

passport.use(Userinformation.createStrategy());


passport.serializeUser(Userinformation.serializeUser());
passport.deserializeUser(Userinformation.deserializeUser());

const imageSchema = new mongoose.Schema({
  imgURL: String,
  caption: String,
  likes: [String],
  private: Number,
  time : String,
  date : String
});
const Postimage = mongoose.model("Postimage", imageSchema);

const postSchema = new mongoose.Schema({
  post: String,
  likes: [String],
  private: Number,
  time : String,
  date : String
});
const Post = mongoose.model("Post", postSchema);


const managePost = new mongoose.Schema({
  posts: [postSchema],
  imgs: [imageSchema],
  registerInfo: registerSchema,
  pendingReq: [],
  friends: []
});
const Managepost = mongoose.model("Managepost", managePost);


//Rout
app.get("/", function(req, res) {

  res.render("mainpage");
});


app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
    const temp = new Userinformation({
      username: _.capitalize(req.body.email),
      password: req.body.pass
    });
    Userinformation.findOne({
      username: _.capitalize(req.body.email)
    }, function(err, foundUser) {
      if (!err) {
        if (foundUser) {
          req.login(temp, function(err) {
            if (err) {
            res.send(err);
            } else {
              bcrypt.compare(req.body.pass, foundUser.pass, function(err, result) {
                if (result === true) {
                  Userinformation.authenticate("local")(req, res, function() {

                    res.redirect("/home/" + foundUser._id);
                  });
                } else {
                  req.flash("danger","Wrong Password Entry")
                  res.redirect("/login");
                }
              });

            }
          });
        }else{
          req.flash("danger","Wrong Email Entry")
              res.redirect("/login");
        }
      }
    });
  });

app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {
    bcrypt.hash(req.body.pass, saltRounds, function(err, hash) {
      Userinformation.findOne({
        username: _.capitalize(req.body.email)
      }, function(err, foundUser) {
        if (!err) {
          if (!foundUser && isValidDate(req.body.date)) {

            Userinformation.register({
              fname: _.capitalize(req.body.fname),
              lname: _.capitalize(req.body.lname),
              username: _.capitalize(req.body.email),
              phone: req.body.phone,
              pass: hash,
              hometown: _.capitalize(req.body.hometown),
              date: req.body.date,
              gender: req.body.gender,
              status: req.body.status
            }, req.body.pass, function(err, user) {
              if (err) {
                res.redirect("/register");
              } else {
                Userinformation.authenticate("local")(req, res, function() {
                  if (req.body.gender === "Male") {
                    res.render("register-img", {
                      pic: "https://res.cloudinary.com/dcfq2rq4o/image/upload/v1587815155/signup_male_miejcs.png",
                      id: user._id
                    });
                  } else if (req.body.gender === "Female") {
                    res.render("register-img", {
                      pic: "https://res.cloudinary.com/dcfq2rq4o/image/upload/v1587815155/signup_female_dr04fx.png",
                      id: user._id
                    });
                  }
                });
              }
            });
          }
        }
      });
    });
  });

app.get("/profile/:id", function(req, res) {
  if (req.isAuthenticated()){
  const friendinfo = [];
  const frie = [];
  const userPosts = [];
  const userImagePosts=[];
  const pends=[];

  Managepost.findOne({
    "registerInfo._id": req.params.id
  }, function(err, found) {
    if (!err) {
      if (found) {

        let fri = found.friends.length;
        let postLength = found.posts.length;
        let imagePostLength = found.imgs.length;
        let pendings=found.pendingReq.length;




        let array=found.posts;
        Array.prototype.push.apply(array,found.imgs);

      const sortedfriends=array.slice().sort((a,b)=>b._id.getTimestamp() - a._id.getTimestamp());

        if(imagePostLength !=0){
          found.imgs.forEach(function(img){
            userImagePosts.push(img)
          });
        }
        if (postLength != 0) {
          found.posts.forEach(function(post) {
            userPosts.push(post);
          });
        }


        if (fri != 0 || pendings!=0) {
          found.friends.forEach(function(friend) {
            frie.push(friend);
          });
          Promise.all(found.pendingReq.map(pend => {
                       return Userinformation.findOne({_id: pend}).exec();
                   })).then(pends => {


          Managepost.find({
            "registerInfo._id": {
              $in: frie
            }
          }, function(err, ss) {
            if (!err) {
              if (ss) {
                ss.forEach(function(s) {
                  friendinfo.push(s);
                });
                res.render("profile", {
                  fname: found.registerInfo.fname,
                  lname: found.registerInfo.lname,
                  phone: found.registerInfo.phone,
                  imgSRC: found.registerInfo.imgURL,
                  hometown: found.registerInfo.hometown,
                  email: found.registerInfo.username,
                  gender: found.registerInfo.gender,
                  status: found.registerInfo.status,
                  posts: found.posts,
                  id: req.params.id,
                  date: found.registerInfo.date,
                  hisid: null,
                  friends: [],
                  pendings: pends,
                  pendings2: [],
                  friendinfo: friendinfo,
                  posts: userPosts,
                  imagePosts : userImagePosts,
                  allpost:sortedfriends,
                  Bio: found.registerInfo.Bio
                });

              }
            }
          });
        }).catch(err => {
                      res.send(err);
                  });

        } else {

          res.render("profile", {
            fname: found.registerInfo.fname,
            lname: found.registerInfo.lname,
            phone: found.registerInfo.phone,
            imgSRC: found.registerInfo.imgURL,
            hometown: found.registerInfo.hometown,
            email: found.registerInfo.username,
            gender: found.registerInfo.gender,
            status: found.registerInfo.status,
            posts: found.posts,
            id: found.registerInfo._id,
            date: found.registerInfo.date,
            hisid: null,
            friends: [],
            pendings: pends,
            pendings2: [],
            friendinfo: [],
            posts: userPosts,
            imagePosts : userImagePosts,
            Bio: found.registerInfo.Bio,
            allpost:sortedfriends
          });
        }

      }
    }
  });
}
else{
  res.redirect("/login");
}
});



app.route("/search/:id")
.get(function(req,res){
  res.redirect("/home/"+req.params.id);
})
  .post(function(req, res) {
    const search = req.body.search;
    const founds = {
      find: [],
    };
    const founds2 = {
      find2: []
    };
    Managepost.find(function(err, found) {
      if (!err) {
        found.forEach(function(foundItem) {
          let name = foundItem.registerInfo.fname+" "+_.lowerFirst(foundItem.registerInfo.lname);
          switch (_.capitalize(search)) {

            case foundItem.registerInfo.fname:
              founds.find.push(foundItem);
              break;
            case foundItem.registerInfo.lname:
              founds.find.push(foundItem);
              break;
            case foundItem.registerInfo.username:
              founds.find.push(foundItem);
              break;
            case foundItem.registerInfo.phone:
              founds.find.push(foundItem);
              break;
            case _.capitalize(foundItem.registerInfo.hometown):
              founds.find.push(foundItem);
              break;
              case name:
              founds.find.push(foundItem);
              break;
            default:

          }
        });
      }
      Managepost.findOne({
        "registerInfo._id": req.params.id
      }, function(err, foundItem) {
        if (!err) {
          if (foundItem) {
            let x = foundItem.pendingReq.length;

            let y = 0;
            if (x != 0) {
              foundItem.pendingReq.forEach(function(founded) {
                Userinformation.findOne({
                  _id: founded
                }, function(err, user) {
                  if (!err) {
                    if (user) {
                      founds2.find2.push(user);
                      y++;
                      if (x == y || y > x) {

                        res.render("findsearch", {
                          founded: founds.find,
                          id: req.params.id,
                          pending: founds2.find2
                        });
                      }

                    }
                  } else
                  res.send(err);
                });
              });
            } else {
              res.render("findsearch", {
                founded: founds.find,
                id: req.params.id,
                pending: founds2.find2
              });
            }
          } else {

          }


        }
      });

    });
  });

// when he search and choose profile
/// not changed yet
app.get("/search/:myid/:id", function(req, res) {
    if (req.isAuthenticated()){
  const frie = [];
  const mypending = [];
  const hispending = [];
  const friendinfo = [];
  const frie2 = [];
  const userPosts = [];
  const userImagePosts =[];

  Managepost.findOne({
    "registerInfo._id": req.params.myid
  }, function(err, user) {
    if (!err) {
      if (user) {
        let fri = user.friends.length;
        let pendings = user.pendingReq.length;

        if (fri != 0) {
          user.friends.forEach(function(friend) {
            frie.push(friend);
          });
        }
        if (pendings != 0) {
          user.pendingReq.forEach(function(reqs) {
            mypending.push(reqs)
          });
        }

        Managepost.findOne({
          "registerInfo._id": req.params.id
        }, function(err, found) {
          if (!err) {
            if (found) {
              let pendings2 = found.pendingReq.length;
              let fri2 = found.friends.length;
              let postsLength = found.posts.length;
              let imagePostLength = found.imgs.length;
              let array=found.posts;
              Array.prototype.push.apply(array,found.imgs);

            const sortedfriends=array.slice().sort((a,b)=>b._id.getTimestamp() - a._id.getTimestamp());
              if (pendings2 != 0) {
                found.pendingReq.forEach(function(reqs2) {
                  hispending.push(reqs2)
                });
              }
              if(imagePostLength != 0){
                found.imgs.forEach(function(img){
                  userImagePosts.push(img);
                });
              }
              if (fri2 != 0) {
                found.friends.forEach(function(friend2) {
                  frie2.push(friend2);
                });
              }
              if (postsLength != 0) {
                found.posts.forEach(function(post) {
                  userPosts.push(post);
                });
              }
              Managepost.find({
                "registerInfo._id": {
                  $in: frie2
                }
              }, function(err, ss) {
                if (!err) {
                  if (ss) {

                    ss.forEach(function(s) {
                      friendinfo.push(s);
                    });

                    res.render("profile", {
                      fname: found.registerInfo.fname,
                      lname: found.registerInfo.lname,
                      phone: found.registerInfo.phone,
                      imgSRC: found.registerInfo.imgURL,
                      hometown: found.registerInfo.hometown,
                      email: found.registerInfo.username,
                      gender: found.registerInfo.gender,
                      status: found.registerInfo.status,
                      posts: found.posts,
                      id: req.params.myid,
                      hisid: req.params.id,
                      date: found.registerInfo.date,
                      friends: frie,
                      pendings: mypending,
                      pendings2: hispending,
                      friendinfo: friendinfo,
                      posts: userPosts,
                      imagePosts : userImagePosts,
                      Bio: found.registerInfo.Bio,
                      allpost:sortedfriends
                    });

                  }
                }
              });
            }
          }
        });

      }
    } else {
      res.send(err);
    }

  });
}
else{
  res.redirect("/login")
}
});

// Routing to home page
app.get("/home/:id", function(req, res) {

  const pends=[];
  const friends=[];
  const sorted=[];
  if (req.isAuthenticated()) {
    Managepost.findOne({
      "registerInfo._id": req.params.id
    }, function(err, foundItem) {
      if (!err) {
        if (foundItem) {
          let pendingReqLength = foundItem.pendingReq.length;
          let friendLength = foundItem.friends.length
          if (pendingReqLength != 0 || friendLength !=0) {

              Promise.all(foundItem.pendingReq.map(pend => {
                  return Userinformation.findOne({_id: pend}).exec();
              })).then(pends => {

                Promise.all(foundItem.friends.map(friend => {
                    return Managepost.findOne({"registerInfo._id": friend}).exec();
                })).then(friends => {


let array=[];
const test=[];
friends.forEach(function(friend){
  array = friend.posts;
  //new array merged in array
  Array.prototype.push.apply(array,friend.imgs);
    const sortedfriends=array.slice().sort((a,b)=>b._id.getTimestamp() - a._id.getTimestamp());
    sortedfriends.forEach(function(sorted){
      test.push(sorted);
    });

});
const sortedfriend=test.slice().sort((a,b)=>b._id.getTimestamp() - a._id.getTimestamp());

res.render("home", {
                     fname: foundItem.registerInfo.fname,
                     id: foundItem.registerInfo._id,
                     imgSRC: foundItem.registerInfo.imgURL,
                     posts: foundItem.posts,
                     pending: pends,
                     friends: sortedfriend,
                    finded : friends
                   });

                }).catch(err => {
                    res.send(err);
                });


              }).catch(err => {
                  res.send(err);
              });
          } else {
            res.render("home", {
              fname: foundItem.registerInfo.fname,
              id: foundItem.registerInfo._id,
              imgSRC: foundItem.registerInfo.imgURL,
              posts: foundItem.posts,
              pending: [],
              friends: [],
              finded : []
            });
          }
        } else {

        }
      }
    });
  } else {
    res.redirect("/login");
  }
});

// to add a new post
app.get("/post/:id", function(req, res) {
res.redirect("/profile/"+req.params.id);

});
//Profile Img Uploading Page
app.post("/upload/:id", parser.single("image"), function(req, res) {
  if (req.file) {
     // to see what is returned to you
    const image = {};
    image.url = req.file.url;
    image.id = req.file.public_id;
    // editing profile picture
    Managepost.findOneAndUpdate({
      "registerInfo._id": req.params.id
    }, {
      "registerInfo.imgURL": image.url,
      "registerInfo.imgID": image.id,
      "registerInfo.Bio": req.body.bio

    }, function(err, foundItem) {
      if (!err) {
        if (foundItem) {

          res.redirect("/home/" + req.params.id);
        } else {
          Userinformation.findOne({
            _id: req.params.id
          }, function(err, found) {
            if (!err) {
              if (found) {
                found.imgURL = image.url;
                found.imgID = image.id;
                found.Bio = req.body.bio;
                found.save();
                const Client = new Managepost({
                  registerInfo: found
                });
                Client.save();

                res.redirect("/home/" + req.params.id);
              }
            }
          });
        }
      }
    });
  } else {
    Userinformation.findOne({
      _id: req.params.id
    }, function(err, foundItem) {
      if (!err) {
        if (foundItem) {
          if (foundItem.gender === "Male") {
            foundItem.imgURL = "https://res.cloudinary.com/dcfq2rq4o/image/upload/v1587815155/signup_male_miejcs.png"
          } else {
            foundItem.imgURL = "https://res.cloudinary.com/dcfq2rq4o/image/upload/v1587815155/signup_female_dr04fx.png"
          }
          foundItem.Bio = req.body.bio;
          foundItem.save();


          const Client = new Managepost({

            registerInfo: foundItem

          });
          Client.save();
          res.redirect("/home/" + req.params.id);
        }
      }
    });
  }
});
app.get("/profile-img/edit/:id", function(req, res) {
res.redirect("/home/"+req.params.id);
});

app.post("/profile-img/edit/:id", function(req, res) {
  Managepost.findOne({
    "registerInfo._id": req.params.id
  }, function(err, foundUser) {
    if (!err) {
      if (foundUser) {

        res.render("edit-pp", {
          id: req.params.id,
          pic: foundUser.registerInfo.imgURL
        });
      }
    } else {
      res.send(err);
    }
  });
});




app.post("/post/:id", parser.single("image"), function(req, res) {
  const tPost = req.body.tPost;
  const id = req.params.id;
const checkedbox = req.body.checkbox;
let private =0;
const dateFormat = new Date();
let day = ("0" + dateFormat.getDate()).slice(-2);
let month = ("0" + (dateFormat.getMonth() + 1)).slice(-2);
let year = dateFormat.getFullYear();
let timeHour = dateFormat.getHours();
let timeMin = dateFormat.getMinutes();
let meridien;
if(timeHour<12){
  meridien = "AM"
}else {
  meridien = "PM"
}
if(timeHour === 0){
  timeHour = 12;
}

else if(timeHour>12){
  timeHour = (timeHour-12);

}
if(timeMin<10){
  timeMin="0"+timeMin;
}





let fullTime = timeHour+":"+timeMin+" "+meridien;
let fullDate = day+"/"+month+"/"+year;
if(checkedbox === "on"){
  private =1;
}

if(req.file){
    const image = {};
  image.url = req.file.url;
  image.id = req.file.public_id;

Managepost.findOne({"registerInfo._id":id},function(err,foundUser){
  if(!err){
    if(foundUser){
      const imgPost= new Postimage({
        imgURL : image.url,
        imgID : image.id,
        caption : tPost,
        private : private,
        time : fullTime,
        date : fullDate,
      });
imgPost.save();

      foundUser.imgs.push(imgPost);
      foundUser.save();
      req.flash("success","Post Added Successfuly");
      res.redirect("/profile/"+ id)
    }
  }
})

}
else
{


  Managepost.findOne({
    "registerInfo._id": id
  }, function(err, foundClient) {
    if (!err) {
      if (foundClient) {

        const pp = new Post({
          post: tPost,
          private: private,
      time : fullTime,
      date : fullDate,
        });
        pp.save();

        if(pp.post != ""){
        foundClient.posts.push(pp);
        foundClient.save();
      }
      req.flash("success","Post Added Successfuly")
      res.redirect("/profile/" + foundClient.registerInfo._id);

      } else {

      }
    } else
      res.send(err);
  });
}
});

app.post("/addfriend/:myid/:id", function(req, res) {
  Managepost.findOne({
    "registerInfo._id": req.params.id
  }, function(err, found) {
    if (!err) {
      if (found) {
        found.pendingReq.push(req.params.myid);
        found.save();
        req.flash("success","Pending For Friend ")
        res.redirect("/search/"+req.params.myid+"/"+req.params.id);
      }
    }
  });
});

app.post("/accept/:myid/:id", function(req, res) {
  const myid = req.params.myid;
  const friendid = req.params.id;
  Managepost.findOneAndUpdate({
    "registerInfo._id": myid
  }, {
    $pull: {
      pendingReq: friendid
    }
  }, function(err, found) {
    if (!err) {
      if (found) {
        found.friends.push(friendid);
        found.save();
      } else {

      }
    }
  });

  Managepost.findOne({
    "registerInfo._id": friendid
  }, function(err, found) {
    if (!err) {
      if (found) {
        found.friends.push(myid);
        found.save();
        req.flash("success","Friend Has Been Added")
        res.redirect("/search/"+req.params.myid+"/"+req.params.id);
      }
    }
  });

});

app.post("/refuse/:myid/:id", function(req, res) {
  const myid = req.params.myid;
  const friendid = req.params.id;
  Managepost.findOneAndUpdate({
    "registerInfo._id": myid
  }, {
    $pull: {
      pendingReq: friendid
    }
  }, function(err, found) {
    if (err)
    res.send(err);
    else {
      if(found){
        req.flash("success","Friend Has Been Rejected")
        res.redirect("/search/"+req.params.myid+"/"+req.params.id);
      }
    }
  });
});

app.post("/edit-pp/:id", parser.single("image"), function(req, res) {

  if (req.file) {
    const dateFormat = new Date();
    let day = ("0" + dateFormat.getDate()).slice(-2);
    let month = ("0" + (dateFormat.getMonth() + 1)).slice(-2);
    let year = dateFormat.getFullYear();
    let timeHour = dateFormat.getHours();
    let timeMin = dateFormat.getMinutes();
    let meridien;
    if(timeHour<12){
      meridien = "AM"
    }else {
      meridien = "PM"
    }
    if(timeHour === 0){
      timeHour = 12;
    }

    else if(timeHour>12){
      timeHour = (timeHour-12);

    }
    if(timeMin<10){
      timeMin="0"+timeMin;
    }





    let fullTime = timeHour+":"+timeMin+" "+meridien;
    let fullDate = day+"/"+month+"/"+year;
   // to see what is returned to you
    const image = {};
    image.url = req.file.url;
    image.id = req.file.public_id;
    // editing profile picture
    Managepost.findOneAndUpdate({
      "registerInfo._id": req.params.id
    }, {
      "registerInfo.imgURL": image.url,
      "registerInfo.imgID": image.id,

    }, function(err, foundItem) {

      if (!err) {
        if (foundItem) {
          const imgPost= new Postimage({
            imgURL : image.url,
            imgID : image.id,
            caption : "New Profile Picture",
            private : 1,
            time : fullTime,
            date : fullDate,
          });
    imgPost.save();

          foundItem.imgs.push(imgPost);
          foundItem.save();
          Userinformation.findOneAndUpdate({_id: req.params.id},{
            imgURL: image.url,
            imgID: image.id
          },function(err,f){
            if(!err){
              if(f){
                res.redirect("/home/" + req.params.id);
              }
            }
          })

        }
      }
    });
  }

});

app.post("/edit/profile-setting/:id",function(req,res){

const id = req.params.id;
const currentPass = req.body.pass;
const newPass = req.body.newpass;
const confirmPass = req.body.confirmnewpass;

Managepost.findOneAndUpdate({"registerInfo._id":id},{"registerInfo.Bio":req.body.bio,
"registerInfo.fname":_.capitalize(req.body.fname),
"registerInfo.lname":_.capitalize(req.body.lname),
"registerInfo.phone":req.body.phone,
"registerInfo.hometown":_.capitalize(req.body.hometown),
"registerInfo.date":req.body.date,
"registerInfo.status":req.body.status,
"registerInfo.gender":req.body.gender},function(err,user){
if(!err){
  if(user){
Userinformation.findOneAndUpdate({_id:id},{  Bio:req.body.bio,
  fname:_.capitalize(req.body.fname),
  lname:_.capitalize(req.body.lname),
  phone:req.body.phone,
  hometown:_.capitalize(req.body.hometown),
  date:req.body.date,
  status:req.body.status,
  gender:req.body.gender},function(err,f){
    if(!err){
      if(f){
        if(currentPass != ""){

        bcrypt.compare(currentPass, user.registerInfo.pass, function(err, result) {
          if (result === true) {
            if(newPass!="" && confirmPass!=""){
      if(newPass === confirmPass){
        bcrypt.hash(newPass, saltRounds, function(err,hash){

          Userinformation.findOneAndUpdate({_id : id},{pass: hash,
      },function(err,found){
      if(!err){
        if(found){
    Managepost.findOneAndUpdate({"registerInfo._id":id},{"registerInfo.pass":hash},function(err,find){
      if(!err){
        if(find){
          req.flash("success","Updated Successfuly")
          res.redirect("/profile/"+id);
        }
      }
    });

      }
      }
        });
      });
    }
    else
    {
      req.flash("danger","New Password Not Equal To Confirmation")
      res.redirect("/profile/"+id);
    }
    }else{
      req.flash("danger","Please Enter Your New Password");
      res.redirect("/profile/"+id);
    }
    }else{
    req.flash("danger","Wrong Passowrd Entry")
    res.redirect("/profile/"+id);
    }
    });
    }else{
      req.flash("success","Updated Successfuly");
      res.redirect("/profile/"+id);
    }
      }
    }
  });


}
}
});

});





app.post("/profile/:id/deletepost",function(req,res){
  const myid = req.params.id;
  const postselected = req.body.deletepostbutton;



  Managepost.findOneAndUpdate({
    "registerInfo._id":myid
  }, {
    $pull: {
      posts: { _id: postselected},
      imgs : {_id : postselected}
    }
  }, function(err, found) {
      if(found){


      }

        res.redirect("/profile/" + found.registerInfo._id);
  });

});

app.post("/home/:id/likepost",function(req,res){
  const myid= req.params.id;
  let flag=0;
  const like = req.body.likebutton;
  Managepost.findOne({"posts._id":like},function(err,found){
    if(!err){
      if(found){

        found.posts.forEach(function(post){

          if(post._id == like){

          post.likes.forEach(function(liked){
            if(liked==myid){
              flag=1;
              post.likes.pull(myid);
              found.save();

              return false;
            }
          });
          if(flag==0){

            post.likes.push(myid);
              found.save();
return false;
          }
          else
          flag=1;
        }
        });


      }
    }
  });

});


app.post("/home/:id/likeimgpost",function(req,res){
  const myid= req.params.id;
  let flag=0;
  const like = req.body.likebutton;
  Managepost.findOne({"imgs._id":like},function(err,found){
    if(!err){
      if(found){
        found.imgs.forEach(function(imgpost){
          if(imgpost._id == like){

          imgpost.likes.forEach(function(liked){
            if(liked==myid){
              flag=1;
              imgpost.likes.pull(myid);
              found.save();


            }
          });
          if(flag==0){

            imgpost.likes.push(myid);
              found.save();

          }
          else
          flag=1;
        }
        });
      }
    }
  });

});


app.get('/logout', function(req, res) {

  req.logout();
  res.redirect("/");
});

function isValidDate(dateString) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false; // Invalid format
  let d = new Date(dateString);
  let dNum = d.getTime();
  let dYear = d.getFullYear(); // input year
  let nD = new Date();
  let nDYear = nD.getFullYear(); // TODAY 2020

  if ((!dNum && dNum !== 0) || (dYear >= (nDYear - 5))) return false; // NaN value, Invalid date
  return d.toISOString().slice(0, 10) === dateString;
}

app.post("/remove-pp/:id",function(req,res){
  const id = req.params.id;
Managepost.findOne({"registerInfo._id": id},function(err,foundItem){
  if(!err){
    if(foundItem){

      if (foundItem.registerInfo.gender === "Male") {
        foundItem.registerInfo.imgURL = "https://res.cloudinary.com/dcfq2rq4o/image/upload/v1587815155/signup_male_miejcs.png";
      } else {
        foundItem.registerInfo.imgURL = "https://res.cloudinary.com/dcfq2rq4o/image/upload/v1587815155/signup_female_dr04fx.png";
      }
      foundItem.save();
      Userinformation.findOne({_id:id},function(err,found){
        if(!err){
          if(found){
            if (found.gender === "Male") {
              found.imgURL = "https://res.cloudinary.com/dcfq2rq4o/image/upload/v1587815155/signup_male_miejcs.png";
            } else {
              found.imgURL = "https://res.cloudinary.com/dcfq2rq4o/image/upload/v1587815155/signup_female_dr04fx.png";
            }
            found.save();
            res.redirect("/home/"+req.params.id);
          }
        }else{
          res.send(err);
        }
      })

    }
  }
  else {
    console.log(err);
  }
});

});

app.listen(3000, function() {
  console.log("server started on port 3000");
});
