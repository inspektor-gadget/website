.PHONY: docs
docs:
	@echo "Fetching external docs…"
	@rm -rf docs versioned_docs versioned_sidebars; rm -f versions.json; mkdir versioned_docs versioned_sidebars;
	python3 ./tools/docs-fetcher.py ./config.yaml
