var express = require('express');
var helper = require('./helper');
var router = express.Router();
var db = require('../db');
var easyimg = require('easyimage');
var async = require('async');

/* GET home page. */
router.get('/', function(req, res, next) {
    if (req.session.user) {
        res.render('index', {
            user: 'fus'
        });
    } else res.redirect('/login.html');
});

router.get('/reg', function(req, res, next) {
    res.redirect('/reg.html');
});

router.post('/reg', function(req, res, next) {
    user = new db.User(req.body.username, req.body.password);
    user.checkExist(function(exist) {
        if (exist) {
            res.send({
                error: 'username already exist!'
            });
        } else {
            user.save();
            res.send({
                success: 'register success!'
            });
        }
    });
});

router.post('/login', function(req, res, next) {
    db.User.checkPasswd(req.body.username, req.body.password, function(
        correct) {
        if (correct) {
            req.session.user = db.User.get(req.body.username, function(user) {
                req.session.user = user;
                res.send({
                    success: 'login success!'
                });
            });
        } else {
            res.send({
                error: 'username or password error!'
            });
        }
    });
});

router.get('/logout', function(req, res, next) {
    req.session.destroy(function() {
        res.redirect('/login.html');
    });
});

router.post('/logout', function(req, res, next) {
    req.session.destroy(function() {
        res.redirect('/login.html');
    });
});


router.post('/api/broadcast/', helper.requireAuthentication, helper.sanitizeMessage,
    function(req, res) {
        helper.sendBroadcast(req.sanitizedMessage);
        res.send(201, "Message sent to all rooms");
    }
);


/*************************************
 * Todo : auth
 *************************************/
router.post('/avatar_raw', function(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    var keys = []
    for (var key in req.files) {
        keys.push(key)
    }
    //I only want first element, may be can opti..
    console.log('debug', req.session.user);
    req.session.uploadPic = req.files[keys[0]].path;
    console.log('debug', req.files[keys[0]]);
    res.send({
        src: req.files[keys[0]].path
    } || {
        Error: 'unkown!'
    })
    res.end();
});

/*************************************
 * Todo : auth
 *************************************/
router.post('/avatar', function(req, res, next) {

    if (!req.session.user) {
        return res.redirect('/login.html');
    }

console.log('debug', req.session.user);

    var x = req.body.x,
        y = req.body.y,
        height = req.body.height,
        width = req.body.width;
    console.log('debug', req.body);
    console.log(x, y, height, width);

    var srcFile = req.session.uploadPic;
    var fileField = srcFile.slice(srcFile.lastIndexOf('.'));
    easyimg.crop({
        src: srcFile,
        //width:width, height:height,

        dst: 'upload/avatar/' + req.session.user.username + fileField,
        cropwidth: width,
        cropheight: height,
        x: x,
        y: y,
        gravity: 'NorthWest'
    }).then(
        function(image) {
            console.log('Resized and cropped: ' + JSON.stringify(image));
          db.User.setAvatar(req.session.user.username, image.path, function(err, resp) {
            console.log('debug-error', err);
            console.log('debug-resp', resp);
            if(resp){
              res.send('success');

            } else {
              res.status(500).send('error');
            }
          });

        },
        function(err) {
            res.status(500).send('error');
        }
    );



});

module.exports = router;