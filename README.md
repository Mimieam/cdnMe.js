# cdnMe.js
A Rapid Prototyping tool to quickly search and inject CDN links of popular libraries into html files.

cdnMe searches and injects cdn links from `jsdelivr`. The latest available version is selected by default. The next version of cdnMe will allow specifying different versions.

##Usage

Add the following your index.html
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
