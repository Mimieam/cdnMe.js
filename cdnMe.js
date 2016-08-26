#!/usr/bin/env node

'use strict'

/**
 * cdnMe is a Rapid Prototyping tool to quickly insert CDN links of popular libraries into an html file.
 * Warning: THIS is NOT a DEPENDENCY MANAGEMENT Tool
 */

const program = require('commander');

var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var request = require("request");
var inquirer = require("inquirer");

/* regex heavily inspired from wiredep*/
var regex = {
    html: {
        block: /(([ \t]*)<!--\s*cdnMe:*(\S*)\s*-->)(\n|\r|.)*?(<!--\s*endcdnMe\s*-->)/gi,
        startCssBlock: /(([ \t]*)<!--\s*cdnMe:css*(\S*)\s*-->)/gi,
        startJsBlock: /(([ \t]*)<!--\s*cdnMe:js*(\S*)\s*-->)/gi,
        endBlock: /(([ \t]*)<!--\s*endcdnMe\s*-->)/gi,
        detect: {
            js: /<script.*src=['"]([^'"]+)/gi,
            css: /<link.*href=['"]([^'"]+)/gi
        },
    }
}
var TEMPLATES = {
    JS: '\t<script src="{{filePath}}"></script>\n\r',
    CSS: '\t<link rel="stylesheet" href="{{filePath}}" />\n\r'
}
var urls = {
    searchQuery: 'http://api.jsdelivr.com/v1/jsdelivr/libraries?name=',
    base: '//cdn.jsdelivr.net/'
}

function buildUrl(pkg) {
    var base = urls.base;
    return base + [pkg.name, pkg.lastversion, pkg.mainfile || pkg.name].join('/');
}

function CDNException(message) {
    this.message = message;
    this.name = "CDNException";
}

function cdnMe(htmlSrcFile, libLinks) {
    /**
     * cdnMe contructor
     * @param  {string} htmlSrcFile - path to the html entrypoint file
     * @param  {object} libLinks  - contains arrays of JS links and CSS links
     * @return {[type]}             [description]
     */
    this.urls = {}
    this.jsFlag = false
    this.cssFlag = false
    this.endBlock = false
    this.blockStr = ""

    this.instream = fs.createReadStream(htmlSrcFile);
    // this.instream.pipe(process.stdout);
    this.outstream = fs.createWriteStream(htmlSrcFile, {
        flags: 'r+',
        mode: 0o777,
        start: 0
    });
    this.rl = readline.createInterface(this.instream, this.outstream);

    this.rl.on('line', (line) => {
        // find starting css block
        if (line.match(regex.html.startCssBlock)) {
            this.cssFlag = true
        }
        if (this.cssFlag && line.match(regex.html.endBlock)) {
            this.cssFlag = false
            if (libLinks.css.length > 0) {
                line = "\t" + libLinks.css.map((x) => {
                    return TEMPLATES.CSS.replace('{{filePath}}', x)
                }).join("\n\t") + "\n" + line
            }
        }
        // find starting js block
        if (line.match(regex.html.startJsBlock)) {
            this.blockStr += line
            this.jsFlag = true
        }
        if (this.jsFlag) {
            this.blockStr += line
        }
        if (this.jsFlag && line.match(regex.html.endBlock)) {
            this.blockStr += line
            this.jsFlag = false
            if (libLinks.js.length > 0) {
                line = libLinks.js.map((x) => {
                    return !this.isPresent(x) ? TEMPLATES.JS.replace('{{filePath}}', x) : null
                }).filter((x) => {
                    return x != null
                }).join("\r") + line
            }
        }
        this.outstream.write(line + "\r\n")
    });

    this.rl.on('close', () => {

    });
    this.isPresent = (x) => {
        if (this.blockStr.includes(x)) {
            console.log(x, " AlREADY ADDED...")
        }
        return this.blockStr.includes(x)
    }
    // save() {
    //     this.outstream = fs.createWriteStream(htmlSrcFile);
    //     this.outstream.write()
}

function findLibrary(library, version) {
    var res = {
        js: [],
        css: []
    }
    return new Promise((resolve, reject) => {
        request({
            url: urls.searchQuery + library,
            json: true
        }, function(error, response, body) {
            if (error) {
                return reject(error)
            }
            // var versions = []
            if (!error && response.statusCode === 200) {
                // console.log(body[0])
                if (body && body[0] != undefined) {
                    var versions = body[0].versions
                        .map((x) => {
                            return x.match('^' + version) ? x : null
                        })
                        .filter((x) => {
                            return x != null
                        })
                        // generate a link for every version
                        // versions.map((x) => {
                        //         body[0].lastversion = x
                        //         console.log(buildUrl(body[0]))
                        //     })
                    res.js.push(buildUrl(body[0]))
                    resolve(res)
                } else {
                    return reject(new Error(`library ${library} not found`))
                }
            }
        })
    });
}

var htmlSrcFile = "index.html"

let searchAndIinject = (library, htmlFile, options) => {
    // console.log(library, htmlFile)
    var req = findLibrary(library, "")
        // var req = findLibrary("Phaser", "2.2.*")
    req.then((val) => {
        var libLinks = val
        console.log("Injecting =>\n\t", val)
        var _cdnMe = new cdnMe(htmlFile, libLinks)
    }).catch((err) => {
        console.log("Error ", err)
    })
        .then((err) => {
            Error(err)
        })
}


program
// .version('0.0.1')
.command('<cdnMe> [library] [htmlFile]', {
    isDefault: true
})
    .option('-v , --version [version_number]', 'select a version, if the version is not available the lastest version will be used')
    .description('inject CDN link into index.html')
    .action(searchAndIinject);
program.parse(process.argv);
// searchAndIinject()

if (program.args.length === 0) program.help();


inquirer.prompt([ /* Pass your questions in here */ ], function(answers) {
    // Use user feedback for... whatever!!
});
