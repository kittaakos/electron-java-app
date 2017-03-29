./gradlew installDist \
&& rm -rf ./electron-src/electron-vaadin-darwin-x64 \
&& cd electron-src \
&& ./node_modules/.bin/electron-packager . --no-prune --icon=icon.ico \
&& cp -R ../build/install/electron-vaadin ./electron-vaadin-darwin-x64/electron-vaadin \
&& cd ..