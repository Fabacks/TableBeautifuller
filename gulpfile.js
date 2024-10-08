const {src, dest, parallel, series, watch} = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const terser = require('gulp-terser');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const header = require('gulp-header');
const cleanCSS = require('gulp-clean-css');
const replace = require('gulp-replace');
const clone = require('gulp-clone');
const merge = require('merge-stream');

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
 */\n\n`;


function js() {
    const jsonData = JSON.stringify(require('./src/languages/en_EN.json'));

    // Création d'un flux de base pour le traitement commun
    const base = src('src/*.js')
        .pipe(replace("'@@INSERT_TRANSLATIONS_HERE@@'", jsonData));
        // .pipe(sourcemaps.write('.'))
        // .pipe(sourcemaps.init())

    // Flux pour la version non-minifiée
    const nonMinified = base
        .pipe(clone());

    // Flux pour la version minifiée
    const minified = base
        .pipe(clone())
        .pipe(terser({
            compress: {
                drop_console: true
        }
        }))
        .pipe(rename({ extname: '.min.js' }));

    // Combinaison des deux flux
    return merge(nonMinified, minified)
        .pipe(header(banner))
        .pipe(dest('dist/js'));
}

function jsPlugins() {
    return src('src/plugins/*.js')
        .pipe(sourcemaps.init())
        .pipe(terser())
        .pipe(header(banner))
        .pipe(rename({ extname: '.min.js' }))
        .pipe(dest('dist/js/plugins'));
}

function jsCopyPlugins() {
    return src('src/plugins/*.js')
        .pipe(header(banner))
        .pipe(dest('dist/js/plugins'));
}

function jsWatch(cb) {
    series(js, jsPlugins, jsCopyPlugins)(cb);
}

function jsWatchPlugins(cb) {
    series(jsPlugins, jsCopyPlugins)(cb);
}

function styles() {
    return src('src/*.scss')
        // .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS())
        .pipe(header(banner))
        .pipe(rename({ extname: '.min.css' }))
        // .pipe(sourcemaps.write('.'))
        .pipe(dest('dist/css'));
}

function stylesCopy() {
    return src('src/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(header(banner))
        .pipe(dest('dist/css'));
}

function styleWatch(cb) {
    series(styles, stylesCopy)(cb);
}

function languages() {
    return src('src/languages/*')
        .pipe(dest('dist/languages'));
}

function watchFiles() {
    watch('src/*.js', jsWatch);
    watch('src/plugins/*.js', jsWatchPlugins);
    watch('src/*.scss', styleWatch);
    watch('src/languages/*', languages);
}

exports.js = js;
exports.styles = styles;
exports.copyStyles = stylesCopy;
exports.languages = languages;
exports.watch = watchFiles;
exports.default = parallel(js, styles, jsPlugins, jsCopyPlugins, stylesCopy, languages);