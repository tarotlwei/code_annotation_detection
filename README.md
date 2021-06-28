# code annotation detection
Incremental detection of code comments

# How to use

## Install
> `npm install code-annotation-detection`

## use
> package.json

    "husky": {
        "hooks": {
            "pre-commit": "cad -b -p 30 -m 30"
        }
    }

## options
> see bin/cad.js