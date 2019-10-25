///////////////////////////////////////////////////////////////////////////////////////////
// gulpfile.js                                                                            /
// author: Jeff May                                                                       /
//                                                                                        /
// gulpfile will concatenate and minify Javascript, CSS, and Javascript libraries         /
// improving your application's performance.                                              /
// Configure your html file to acquire the output minified files from the "dist"          /
// directory                                                                              /
//                                                                                        /
// Dependencies:  node.js                                                                 /
//                gulp-cli node module (enter npm install gulp-cli --g in command prompt) /
//                                                                                        /
//                                                                                        /
// to run this script, make sure to npm install package.json in the root driectory of     /
// your application.  Then, using the command prompt, navigate to the application root    /
// directory and type "gulp".  This will run the css and js optimization tools as well as /
// initilize the css and js watch tasks.  If you want to optimize 3rd party libraries,    /
// you must run "gulp lib-optimize" in cmd from the application root directory.           /
// Verify your directories are correctly specified in lines 35-39                         /
//                                                                                        /
// Last updated: 12/30/2016  by Jeff May                                                  /
///////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////

'use strict';
var gulp = require('gulp');
var gutil = require("gulp-util");
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var ugly = require("gulp-uglify");
var uglycss = require("gulp-uglifycss");
var htmlmin = require("gulp-htmlmin");
var order = require("gulp-order");
var purify = require('gulp-purifycss');
var imagemin = require('gulp-imagemin');
var browserSync = require('browser-sync').create();
var webstandards = require('gulp-webstandards');
var gzip = require("gulp-gzip");
var babel = require('gulp-babel');
var watch = require('gulp-watch');
var sass = require('gulp-sass');

//////////////////////////////////////////
//specify directories for js, css, library files
var config = {
    "css":  "./src/css/**/*.css",
    "js" :  "./src/js/**/*.js",
    "lib":  "./src/lib/*.js",
    "html": "./*.html"
};

//////////////////////////////////////////

// Check for '--min' flag (true if present)

var useMinifiedSources = gutil.env.min;

// in the terminal type gulp test

// first param is name, second is the
// function called when you call gulp
// with the name

//gulp task to optimize third party js libs hosted locally
//////////////////////////////////////////////////////////////////////////
gulp.task('lib-optimize', function(){
  console.log('gulp is working: concatenating lib files');

  gulp.src([
	  //EXAMPLES
    "./src/client/lib/jquery1.11.3.js",
    "./src/client/lib/TOC.js",
    "./src/client/lib/bootstrap.js"
		//

  ])

  .pipe(order([
		 //EXAMPLES
     'jquery1.11.3.js',
     'TOC.js',
     'bootstrap.js',
		 //

   ], {base: './src/client/lib/'})
    )
  //concatenate js files and name new file "lib-main.js"
  .pipe(concat("lib.js"))
  //path to build
  .pipe(gulp.dest('./src/client/dist/'))
  //create a copy of main.js called "main.min.js" for minification
  .pipe(rename("lib.min.js"))
  //uglify min file
  .pipe(ugly())

  .pipe(gulp.dest('./src/client/dist/'));

  console.log('gulp is done');
});
//////////////////////////////////////////////////////////////////////////////

gulp.task('copy', function () {
    gulp.src('./src/js/bs64.min.js')
        .pipe(gulp.dest('./src/dist'));
});

//create javascript optimization task
////////////////////////////////////////////////////////////////////////////////
gulp.task('js', function(){
  // config.js
  console.log('gulp is working: concatenating and minifying js files');

  // explicitly define js files to run gulp task on, this prevents concatenating uncessesary
  // js files
   gulp.src([
	 
			'./src/js/bootstrap-select.js',
			 './src/js/map.js',
   ])
   //define concatenation order of js files
  .pipe(order([

		 'bootstrap-select.js',
		 'map.js',

   ], {base: './src/js/'})
    )
  //babel for es6 compatibility
  .pipe(babel({
    presets: ['es2015']
  }))
  //concatenate js files and name new file "main.js"
  .pipe(concat("main.js"))
  //path to build.  If "dist" directory does not exists, it will be created.  dist is the conventional name for optimized app files
  //CHECK THAT THIS PATH IS CORRECT FOR YOUR APPLICATION
  .pipe(gulp.dest('./src/dist/'))
  //create a copy of main.js called "main.min.js" for minification
  .pipe(rename("main.min.js"))
  //uglify min file
  .pipe(ugly())
  .pipe(ugly().on('error', gutil.log))
  .pipe(gulp.dest('./src/dist'));

  console.log('gulp is done');
});

//create css optimization task
////////////////////////////////////////////////////////////////////////////////
gulp.task('css', function(){
  // config.js
  console.log('gulp is working: concatenating and minifying css files');

  gulp.src(config.css)
  //concat files and return as main.js
  .pipe(concat("styles.css"))
  //path to build
  .pipe(gulp.dest('./src/dist/'))
  .pipe(rename("styles.min.css"))
  .pipe(uglycss({
    "maxLineLen": 80,
    "uglyComments": true
  }))
  .pipe(gulp.dest('./src/dist/'));

  console.log('gulp is done');
});
////////////////////////////////////////////////////////////////////////////////

gulp.task('html', function () {
  // return gulp.src(config.html)
  //   .pipe(htmlmin({
  //     collapseWhitespace: true
  //   }))
  //   .pipe(gulp.dest('./src/dist/'));
});

//The follwing watch tasks prevent you from having to run gulp every time an edit
//is made to any css or js application files. :)

//set watch on css directory, run css-optimize every time a CSS file changes
gulp.task('watch:css', function(){
  gulp.watch(config.css, ['css-optimize']);
});

//set watch on css directory, run js-optimize every time a JS file changes
gulp.task('watch:js', function(){
  gulp.watch(config.js, ['js-optimize']);
});

//Create browser sync task
gulp.task('browser-sync', () => {
  browserSync.init({
    server: {
      baseDir: "./"
    }
  });
});

//create watch task
gulp.task('watch-bs', ['browser-sync'], () => {
  gulp.watch(config.html, ['html']).on("change", browserSync.reload);
  gulp.watch(config.css, ['css']).on('change', browserSync.reload);
  gulp.watch(config.js, ['js']).on('change', browserSync.reload);
});

//set watch on js, css, HTML fiels, run every time a HTML/JS/CSS file changes
gulp.task('watch', () => {
  gulp.watch(config.css, ['css']);
  gulp.watch(config.js, ['js']);
  gulp.watch(config.html, ['html']);
});

//create the default task
// these are the tasks that run when you enter "gulp" into the command prompt
gulp.task('default', ['css','js', 'html', 'watch-bs']);
