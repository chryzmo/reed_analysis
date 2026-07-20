.PHONY: help install dev build preview lint typecheck test clean

help:
	@echo "Available targets:"
	@echo "  install    Install dependencies"
	@echo "  dev        Start the Vite dev server"
	@echo "  build      Type-check and build for production"
	@echo "  preview    Preview the production build locally"
	@echo "  lint       Run oxlint"
	@echo "  typecheck  Run the TypeScript compiler with no emit"
	@echo "  test       Note on this project's (lack of) automated tests"
	@echo "  clean      Remove build output and TS build cache"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

lint:
	npm run lint

typecheck:
	npx tsc -b

test:
	@echo "No automated test suite: this depends on a live mic and real playing."
	@echo "Validate manually via 'make dev' — see CLAUDE.md's testing/validation notes."

clean:
	rm -rf dist dist-ssr node_modules/.tmp
