.PHONY: all
all: getdeps build	

.PHONY: getdeps
getdeps:
	yarn

.PHONY: build
build:
	yarn build

.PHONY: run
run:
	npm run serve
