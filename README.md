# cdnMe.js
[![NPM](https://nodei.co/npm/cdnme.png?downloads=true)](https://nodei.co/npm/cdnme.png?downloads=true)

A Rapid Prototyping tool to quickly search and inject CDN links of popular libraries into html files.

cdnMe searches and injects cdn links from `jsdelivr`. The latest available version is selected by default. The next major version of cdnMe will allow specifying different versions.


##Usage

Add the following in your index.html ( see [update 1.1.0](#110) for auto Inject )
```
<!-- cdnMe:js -->
<!-- endcdnMe -->
```

Run `cdnMe <library> <htmlFilePath>`
```shell
> cdnMe phaser src/index.html
```

and Voila!

```html

<body>
    <!-- cdnMe:js -->
    <script src="//cdn.jsdelivr.net/d3js/3.5.17/d3.min.js"></script>
    <script src="//cdn.jsdelivr.net/phaser/2.6.1/phaser.min.js"></script>
    <!-- endcdnMe -->
</body>
```


##Updates

#### 1.3.0
* fixed injection for frameworks which provides both css and js files (i.e: bootstraps, foundation, etc..).

#### 1.2.1
* patch js tag is now added right after the opening body tag

#### 1.2.0
* Both CSS and JS Tags are now auto injected with option `-j`.
* **cdnme** has now support for CSS libraries.

#### 1.1.0
* autoInject tag options added.

    Running `cdnMe -j <htmlFilePath>` will Inject the **cdnMe** tags after opening `<body>` tag.

##Thank you!
Please [**Star the Repos**](https://github.com/Mimieam/cdnMe.js) as it keeps me motivated ^^, and leave me a note in case of issues or suggestions :)<br />
Thanks for using **cdnMe**
