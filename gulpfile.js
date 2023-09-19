const {src, dest, parallel, watch} = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const terser = require('gulp-terser');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const header = require('gulp-header');

const package = require('./package.json');
const banner = `/**
 * TableBeautifuller
 * 
 * Author: Fabacks
 * License: Free distribution except for commercial use
 * GitHub Repository: https://github.com/Fabacks/TableBeautifuller
 * Version ${package.version}
 * 
 * This software is provided "as is" without any warranty. The author is
 * not responsible for any damages or liabilities caused by the use of this software.
 * Please do not use this software for commercial purposes without explicit permission from the author.
 * If you use or distribute this software, please credit the author and link back to the GitHub repository.
 */\n\n\n`;


function js() {
    return src('src/*.js')
        .pipe(sourcemaps.init())
        .pipe(terser())
        .pipe(header(banner))
        .pipe(rename({ extname: '.min.js' }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest('dist/js'));
}

function styles() {
    return src('src/*.scss')
        .pipe(sourcemaps.init())
        .pipe(header(banner))
        .pipe(sass().on('error', sass.logError))
        .pipe(rename({ extname: '.min.css' }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest('dist/css'));
}

function copyJs() {
    return src('src/*.js')
        .pipe(header(banner))
        .pipe(dest('dist/js'));
}

function copyStyles() {
    return src('src/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(header(banner))
        .pipe(dest('dist/css'));
}

function languages() {
    return src('src/languages/*')
        .pipe(dest('dist/languages'));
}

function watchFiles() {
    watch('src/*.js', js);
    watch('src/*.scss', styles);
    watch('src/languages/*', languages);
}

exports.js = js;
exports.styles = styles;
exports.copyJs = copyJs;
exports.copyStyles = copyStyles;
exports.languages = languages;
exports.watch = watchFiles;
exports.default = parallel(js, styles, copyJs, copyStyles, languages);