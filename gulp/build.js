'use strict';

var gulp = require('gulp');

var $ = require('gulp-load-plugins')({
  pattern: ['gulp-*', 'main-bower-files', 'uglify-save-license', 'del']
});

// wiredep -> Wire dependencies to your source code. https://github.com/taptapship/wiredep
gulp.task('styles', ['wiredep', 'injector:css:preprocessor'], function () {
  return gulp.src(['src/app/index.less', 'src/app/vendor.less'])
    .pipe($.less({
      paths: [
        'src/bower_components',
        'src/app',
        'src/components'
      ]
    }))
    .on('error', function handleError(err) {
      console.error(err.toString());
      this.emit('end');
    })
    .pipe($.autoprefixer()) // Prefix CSS https://github.com/sindresorhus/gulp-autoprefixer
    .pipe(gulp.dest('.tmp/app/'));
});

gulp.task('injector:css:preprocessor', function () {
  return gulp.src('src/app/index.less')
    .pipe($.inject(gulp.src([ // A javascript, stylesheet and webcomponent injection plugin for Gulp https://github.com/klei/gulp-inject
        'src/{app,components}/**/*.less',
        '!src/app/index.less',
        '!src/app/vendor.less'
      ], {read: false}), {
      transform: function(filePath) {
        filePath = filePath.replace('src/app/', '');
        filePath = filePath.replace('src/components/', '../components/');
        return '@import \'' + filePath + '\';';
      },
      starttag: '// injector',
      endtag: '// endinjector',
      addRootSlash: false
    }))
    .pipe(gulp.dest('src/app/'));
});

gulp.task('injector:css', ['styles'], function () {
  return gulp.src('src/index.html')
    .pipe($.inject(gulp.src([
        '.tmp/{app,components}/**/*.css',
        '!.tmp/app/vendor.css'
      ], {read: false}), {
      ignorePath: '.tmp',
      addRootSlash: false
    }))
    .pipe(gulp.dest('src/'));
});

gulp.task('scripts', function () {
  return gulp.src('src/{app,components}/**/*.js')
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'));
});

gulp.task('injector:js', ['scripts', 'injector:css'], function () {
  return gulp.src(['src/index.html', '.tmp/index.html'])
    .pipe($.inject(gulp.src([
      'src/{app,components}/**/*.js',
      '!src/{app,components}/**/*.spec.js',
      '!src/{app,components}/**/*.mock.js'
    ]).pipe($.angularFilesort()), { // Automatically sort AngularJS app files depending on module definitions and usage https://github.com/klei/gulp-angular-filesort
        ignorePath: 'src',
      addRootSlash: false
    }))
    .pipe(gulp.dest('src/'));
});

gulp.task('partials', ['consolidate'], function () {
  return gulp.src(['src/{app,components}/**/*.html', '.tmp/{app,components}/**/*.html'])
    .pipe($.minifyHtml({ // A Gulp plugin that minifies html with Minimize https://github.com/jonathanepollack/gulp-minify-html
      empty: true,
      spare: true,
      quotes: true
    }))
    .pipe($.angularTemplatecache('templateCacheHtml.js', { // Concatenates and registers AngularJS templates in the $templateCache. https://github.com/miickel/gulp-angular-templatecache
      module: 'yogulpang'
    }))
    .pipe(gulp.dest('.tmp/inject/'));
});

gulp.task('html', ['wiredep', 'injector:css', 'injector:js', 'partials'], function () {
  var htmlFilter = $.filter('*.html');
  var jsFilter = $.filter('**/*.js');
  var cssFilter = $.filter('**/*.css');
  var assets;

  return gulp.src(['src/*.html', '.tmp/*.html'])
    .pipe($.inject(gulp.src('.tmp/inject/templateCacheHtml.js', {read: false}), {
      starttag: '<!-- inject:partials -->',
      ignorePath: '.tmp',
      addRootSlash: false
    }))
    //Explanation of this pipeline : https://github.com/jamesknelson/gulp-rev-replace#usage
    .pipe(assets = $.useref.assets())
    .pipe($.rev()) // Static asset revisioning by appending content hash to filenames: unicorn.css → unicorn-098f6bcd.css https://github.com/sindresorhus/gulp-rev
    .pipe(jsFilter)
    .pipe($.ngAnnotate()) // Add, remove and rebuild AngularJS dependency injection annotations https://github.com/olov/ng-annotate
    .pipe($.uglify({preserveComments: $.uglifySaveLicense}))
    .pipe(jsFilter.restore())
    .pipe(cssFilter)
    .pipe($.replace('bower_components/bootstrap/fonts','fonts'))
    .pipe($.csso())
    .pipe(cssFilter.restore())
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe($.revReplace()) // Rewrite occurences of filenames which have been renamed by gulp-rev https://github.com/jamesknelson/gulp-rev-replace
    .pipe(htmlFilter)
    .pipe($.minifyHtml({
      empty: true,
      spare: true,
      quotes: true
    }))
    .pipe(htmlFilter.restore())
    .pipe(gulp.dest('dist/'))
    .pipe($.size({ title: 'dist/', showFiles: true }));
});

gulp.task('images', function () {
  return gulp.src('src/assets/images/**/*')
    .pipe($.imagemin({ //  Minify images seamlessly. https://github.com/imagemin/imagemin
      optimizationLevel: 3,
      progressive: true,
      interlaced: true
    }))
    .pipe(gulp.dest('dist/assets/images/'));
});

gulp.task('fonts', function () {
  return gulp.src($.mainBowerFiles())
    .pipe($.filter('**/*.{eot,svg,ttf,woff}'))
    .pipe($.flatten())
    .pipe(gulp.dest('dist/fonts/'));
});

gulp.task('misc', function () {
  return gulp.src('src/**/*.ico')
    .pipe(gulp.dest('dist/'));
});

gulp.task('clean', function (done) {
  $.del(['dist/', '.tmp/'], done);
});

gulp.task('build', ['html', 'images', 'fonts', 'misc']);
