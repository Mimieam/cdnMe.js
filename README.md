# cdnMe.js
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
#### 1.2.0
* Both CSS and JS Tags are now auto injected with option `-j`.
* cdnme has now support for CSS libraries.

#### 1.1.0
* autoInject tag options added.

    Running `cdnMe -j <htmlFilePath>` will Inject the **cdnMe** tags before the last `</body>` tag.


