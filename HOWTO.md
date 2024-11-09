### run locally 

in terminal
```
npx ui5 serve --port 8080 -o index-cdn.html
```

in browser
```
http://localhost:8080/index-cdn.html
```

### deploy to github.io

Steps:

1. set version timestamp using sed
2. run npm build
3. clean up the result, remove debug, test, unused libs etc.
4. push to github. content of the docs subfolger is used for servig the webapp.

in terminal
```
sed -i -r "s/(.*)(Version Timestamp = )(.*)\./\1\2$(date +%s)./" ./webapp/view/Settings.view.xml
```
```
npm run build:opt
```
```
./cleanup-dist.sh 
```
```
git add .
```
```
git commit -m "some improvements"
```
```
git push
```

in browser
```
https://<your github userid>.github.io/watchlist-ui5/#
```

beware, in browsers the cache has to be cleard to be using a new version.