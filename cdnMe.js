#!/usr/bin/env node

'use strict'

/**
 * cdnMe is a Rapid Prototyping tool to quickly insert CDN links of popular libraries into an html file.
 * Warning: THIS is NOT a DEPENDENCY MANAGEMENT Tool
 */

var fs = require('fs');
var readline = require('readline');
var stream = require('stream');
var request = require("request");
var program = require('commander');
var inquirer = require("inquirer");
var path = require('path');

/* regex heavily inspired from wiredep*/
var regex = {
    html: {
        block: /(([ \t]*)<!--\s*cdnMe:*(\S*)\s*-->)(\n|\r|.)*?(<!--\s*endcdnMe\s*-->)/gi,
        startCssBlock: /(([ \t]*)<!--\s*cdnMe:css*(\S*)\s*-->)/gi,
        startJsBlock: /(([ \t]*)<!--\s*cdnMe:js*(\S*)\s*-->)/gi,
        endBlock: /(([ \t]*)<!--\s*endcdnMe\s*-->)/gi,
        detect: {
            js: /<script.*src=['"]([^'"]+)/gi,
            css: /<link.*href=['"]([^'"]+)/gi,
            body: /<\/body>/gi,
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
    this.toString = () => {return `${this.name}: ${this.message}`}
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
        console.log("Closing")
    });
    this.isPresent = (x) => {
        if (this.blockStr.includes(x)) {
            console.log(x, " AlREADY ADDED...\n")
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

let searchAndInject = (library, htmlFile, options) => {
    var req = findLibrary(library, "")
        // var req = findLibrary("Phaser", "2.2.*")
    req.then((val) => {
        var libLinks = val
        console.log("Injecting =>\t", val.js)
        var _cdnMe = new cdnMe(htmlFile, libLinks)
    }).catch((err) => {
        console.log("Error ", err)
    })
        .then((err) => {
            Error(err)
        })
}

function InjectJSCommentBlock(htmlSrcFile) {
    var ins = fs.createReadStream(htmlSrcFile);
    // ins.pipe(process.stdout);
    var out = fs.createWriteStream(htmlSrcFile, {
        flags: 'r+',
        mode: 0o777,
        start: 0
    });
    var rl2 = readline.createInterface(ins, out);
    console.log("InjectJSCommentBlock =>>", path.resolve(htmlSrcFile))
    var ln = 1
    rl2.on('line', (line) => {
        try{
            if (line.match(regex.html.startJsBlock) || line.match(regex.html.endBlock)  ) {
                throw new CDNException(`Couldn't autoInject cdnMe Tags \n\t  Tags already FOUND => ${line} (@ln ${ln})`)
            } else if (line.match(regex.html.detect.body)) {
                console.log("BODY TAG FOUND ======>", line, ln)
                console.log(`cdnMe Tags Injected SUCCESSFULLY - (@ln ${ln})`)
                line = "\t<!-- cdnMe:js -->\r\n\t<!-- endcdnMe -->\r\n" + line
            }
            out.write(line + "\r\n")
        } catch(e){
            console.log(e.toString())
            process.exit(0)
        }
        ln +=1 // increment line number
    });


    rl2.on('close', () => {
        console.log("Closing rl2 - Done Injecting JS Comment Block")
    });
}

let insertJSBlock = (htmlFile) => {
    console.log(`Comming Soon Sorry... ${htmlFile}`)
    InjectJSCommentBlock(htmlFile)
}

var optionFlag = false

program
    .version('1.1.0')
    .option('-j, --jsblock <htmlFile>', 'auto insert jsBlock', insertJSBlock)
    .usage('[options] <library> <htmlFile>')
    // .command('cdnMe <library> <htmlFile>', {isDefault: true})
    .description('inject a CDN link into index.html')
    .action(searchAndInject)

program.parse(process.argv);

// detect if any option (beside version) is being used and set the optionFlag to true
program.options.map((x) => {
    var optionName = x.long.slice(2)
    if (optionName != "version") {
        if (program[optionName]) {
            optionFlag = true
        }
    }
})

if (!optionFlag && program.args.length === 0) program.help();
