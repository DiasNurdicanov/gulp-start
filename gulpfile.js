"use strict";

var gulp = require("gulp");
var sass = require("gulp-sass");
var plumber = require("gulp-plumber");
var bulkSass = require("gulp-sass-bulk-import");
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
var mqpacker = require("css-mqpacker");
var sortCSSmq = require("sort-css-media-queries");
var minify = require("gulp-csso");
var rename = require("gulp-rename");
var del = require("del");
var copy = require("gulp-copy");
var imagemin = require("gulp-imagemin");
var objectFit = require("postcss-object-fit-images")
var svgstore = require("gulp-svgstore");
var cheerio = require('gulp-cheerio');
var run = require("run-sequence");
var server = require("browser-sync").create();
var newer = require("gulp-newer");
var include = require("gulp-rigger");
var jsMinify = require("gulp-uglify");
var gutil = require("gulp-util");
var inject = require("gulp-inject");
var pug = require('gulp-pug');

gulp.task("clean", function() {
  return del("build");
});

gulp.task("copy", function() {
  return gulp.src([
    "src/fonts/**/*.{woff,woff2}",
    "src/img/**",
    "src/video/**",
    "src/js/**",
    "src/*.html"
  ])
  .pipe(copy("build", {prefix: 1}));
});

gulp.task("pug", function () {
  return gulp.src("src/pug/*.pug")
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(gulp.dest("build"));
});

gulp.task("js:copy", function() {
  return gulp.src("src/js/**/*.js")
    .pipe(newer("build/js"))
    .pipe(gulp.dest("build/js"));
});

gulp.task("js:include", function () {
  return gulp.src("src/js/**/*.js")
    .pipe(plumber())
    .pipe(include())
    .pipe(gulp.dest("build/js"))
});

gulp.task("js:minify", function () {
  return gulp.src("build/js/script.js")
    .pipe(jsMinify())
    .on("error", function (err) { gutil.log(gutil.colors.red("[Error]"), err.toString()); })
    .pipe(gulp.dest("build/js"))
});

gulp.task("images:copy", function() {
  return gulp.src("src/img/**")
    .pipe(newer("build/img"))
    .pipe(gulp.dest("build/img"));
});

function reload (done) {
  server.reload();
  done();
}

gulp.task('html:build', function (cb) {
  run("pug", "svg-sprite", cb);
});

gulp.task("html:update", ["html:build"], reload);
gulp.task("js:update", ["js:copy", "js:include"], reload);
gulp.task("images:update", ["images:copy"], reload);

gulp.task("style", function() {
  gulp.src("src/sass/style.scss")
    .pipe(plumber())
    .pipe(bulkSass())
    .pipe(sass())
    .pipe(postcss([
      autoprefixer({browsers: [
        "last 2 versions"
      ]}),
      mqpacker({
        sort: sortCSSmq
      }),
      objectFit()
    ]))
    .pipe(gulp.dest("build/css"))
    .pipe(minify())
    .pipe(rename("style.min.css"))
    .pipe(gulp.dest("build/css"))
    .pipe(server.stream());
});

gulp.task("images", function() {
  return gulp.src("build/img/**/*.{png,jpg,gif}")
  .pipe(imagemin([
    imagemin.optipng({optimizationLevel: 3}),
    imagemin.jpegtran({progressive: true})
  ]))
  .pipe(gulp.dest("build/img"));
});

gulp.task("serve", ["style"], function() {
  server.init({
    server: "build/",
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  gulp.watch("src/sass/**/*.{scss,sass}", ["style"]);
  gulp.watch("src/js/**/*.js", ["js:update"]);
  gulp.watch("src/img/*", ["images:update"]);
  gulp.watch("src/pug/*.pug", ["html:update"]);
  gulp.watch("src/img/icons/*.svg", ["html:update"]);
});

gulp.task("svg-sprite", function () {
  var svgs = gulp.src("src/img/icons/*.svg")
    .pipe(cheerio({
      run ($) {
        $("[fill]").removeAttr("fill");
        $("[stroke]").removeAttr("stroke");
      },
      parserOptions: {xmlMode: true}
    }))
    .pipe(svgstore({
      inlineSvg: true
    }));

    function fileContents (filePath, file) {
      return file.contents.toString();
    }

    return gulp
      .src('build/*.html')
      .pipe(inject(svgs, { transform: fileContents }))
      .pipe(gulp.dest('build'));

  });

gulp.task("build", function() {
  run(
    "clean",
    "copy",
    "pug",
    "style",
    "js:include",
    "js:minify",
    "images",
    "svg-sprite"
  );
});
