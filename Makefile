.SILENT:
.DEFAULT:
help:
	echo
	echo "Storj.io Heroku Add-on SMTP Server Make commands"
	echo
	echo "  Commands: "
	echo
	echo "    help - show this message (default)"
	echo "    test - run tests against the codebase"
	echo "    docker-clean - remove all docker containers"
	echo "    docker-build - build fresh docker containers"
	echo "    coverage - start a webserver with a code coverage report"

test: docker-clean docker-build
	mkdir -p coverage
	docker run \
		-a stdout \
		-a stderr \
		-v ${PWD}/coverage:/usr/src/app/coverage \
		--name account-mapper \
		storj/account-mapper

coverage: build-coverage
	mkdir -p coverage
	docker run \
		-a stdout \
		-a stderr \
		-v ${PWD}/coverage:/usr/src/app \
		-p 8000:8000 \
		--rm \
		storj/account-mapper-coverage

build-coverage:
	docker build -f ./dockerfiles/coverage.Dockerfile -t storj/account-mapper-coverage .

docker-clean:
	docker rm -f account-mapper || true

docker-build: ./dockerfiles
	docker build -f ./dockerfiles/test.Dockerfile -t storj/account-mapper .


deps:
	echo "  Dependencies: "
	echo
	echo "    * docker $(shell which docker > /dev/null || echo '- \033[31mNOT INSTALLED\033[37m')"

.PHONY: docker-clean docker-build test deps
