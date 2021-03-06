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
            body: /<body>/gi,
            head: /<\/head>/gi,
        },
    }
}
var TEMPLATES = {
    JS: '\t<script src="{{filePath}}"></script>\n\r',
    CSS: '\t<link rel="stylesheet" href="{{filePath}}" />\n\r'
}
var urls = {
    searchQuery: 'http://api.jsdelivr.com/v1/jsdelivr/libraries?name=',
    searchParams: '&fields=assets',
    base: '//cdn.jsdelivr.net/'
}

function buildUrl(pkg, filename) {
    var base = urls.base;
    var name = filename
    return base + [pkg.name, pkg.lastversion, filename|| pkg.mainfile || pkg.name].join('/');
}

function getExtension(fname){
    /*
        Thanks VisionN
        http://stackoverflow.com/a/12900504/623546
     */
    return fname.slice((Math.max(0, fname.lastIndexOf(".")) || Infinity) + 1)
}

function isInArray(arr, item){
    return !!~arr.indexOf(item)
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
    this.blockStr = ""  // a merge of both css and js block

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
            this.blockStr += line
            this.cssFlag = true
        }
        if (this.cssFlag) {
            this.blockStr += line
        }
        if (this.cssFlag && line.match(regex.html.endBlock)) {
            this.cssFlag = false
            if (libLinks.css.length > 0) {
                line = libLinks.css.map((x) => {
                    return !this.isPresent(x) ? TEMPLATES.CSS.replace('{{filePath}}', x) : null
                }).filter((x) => {
                    return x != null
                }).join("\r") + line
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
        this.outstream.write(line + "\r")
    });

    this.rl.on('close', () => {
        // console.log("Closing")
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


                if (body && body[0] != undefined) {
                    var files = body[0].assets[0].files
                    var _name = body[0].mainfile.split(".")[0] // wow this looks gross...
                    var name = _name.split('/')

                    var opposite_name_prefix = name.length > 1 ? name[0] +"/":""
                     opposite_name_prefix = opposite_name_prefix == "js" ? "css/":"js/"
                    name = name.length > 1 ? name[1]: name[0]

                        // var versions = body[0].versions
                        //     .map((x) => {
                        //         return x.match('^' + version) ? x : null
                        //     })
                        //     .filter((x) => {
                        //         return x != null
                        //     })
                        // generate a link for every version
                        // versions.map((x) => {
                        //         body[0].lastversion = x
                        //         console.log(buildUrl(body[0]))
                        //     })
                    var ext = getExtension(body[0].mainfile)
                    ext === 'css' ? res.css.push(buildUrl(body[0])) : res.js.push(buildUrl(body[0]))
                    if (ext === 'js') {
                        files
                            .filter((x) => {return x.includes(`${name}.min.css`)})
                            .map((x) => {res.css.push(buildUrl(body[0], x))} )

                    }

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
        console.log("Injecting =>\t", val)
        var _cdnMe = new cdnMe(htmlFile, libLinks)
    }).catch((err) => {
        console.log("Error ", err)
    })
        .then((err) => {
            Error(err)
        })
}

function InjectJSAndCSSCommentBlock(htmlSrcFile) {
    var ins = fs.createReadStream(htmlSrcFile);
    // ins.pipe(process.stdout);
    var out = fs.createWriteStream(htmlSrcFile, {
        flags: 'r+',
        mode: 0o777,
        start: 0
    });
    var rl2 = readline.createInterface(ins, out);
    var ln = 1
    rl2.on('line', (line) => {
        try{
            if (line.match(regex.html.startCssBlock)) {
                throw new CDNException(`Couldn't autoInject cdnMe Tags \n\t  Tags already FOUND => ${line} (@ln ${ln})`)
            } else if (line.match(regex.html.detect.head)) {
                console.log(`cdnMe css - Tags Injected SUCCESSFULLY - (@ln ${ln})`)
                line = "\t<!-- cdnMe:css -->\r\n\t<!-- endcdnMe -->\r\n" + line
            }else if (line.match(regex.html.startJsBlock) || line.match(regex.html.endBlock)  ) {
                throw new CDNException(`Couldn't autoInject cdnMe Tags \n\t  Tags already FOUND => ${line} (@ln ${ln})`)
            } else if (line.match(regex.html.detect.body)) {
                console.log(`cdnMe js - Tags Injected SUCCESSFULLY - (@ln ${ln})`)
                line += "\r\n\t<!-- cdnMe:js -->\r\n\t<!-- endcdnMe -->\r\n"
            }
            out.write(line + "\r\n")
        } catch(e){
            console.log(e.toString())
            process.exit(0)
        }
        ln +=1 // increment line number
    });


    rl2.on('close', () => {
        // console.log("Closing rl2 - Done Injecting JS Block")
    });
}

let insertJSBlock = (htmlFile) => {
    InjectJSAndCSSCommentBlock(htmlFile)
}

var optionFlag = false

program
    .version('1.3.2')
    .option('-j, --jsblock <htmlFile>', 'auto insert jsBlock and cssBlock', insertJSBlock)
    // .option('-c, --cssblock <htmlFile>', 'auto insert cssBlock', insertCSSBlock)
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
