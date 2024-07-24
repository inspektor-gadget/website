all: getdeps docs
	npm run build

getdeps:
	pip3 install --upgrade pyyaml
	npm i

.PHONY: docs
docs:
	@echo "Fetching external docs…"
	@rm -rf docs versioned_docs versioned_sidebars; rm -f versions.json; mkdir versioned_docs versioned_sidebars;
	python3 ./tools/docs-fetcher.py ./config.yaml

run:
	npm run start