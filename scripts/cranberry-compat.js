'use strict';
var inquirer = require('inquirer');
var fs = require('fs');
var path = require('path');

inquirer
    .prompt([
        {
            type: 'input',
            name: 'cranver',
            message: 'Cranberry minimum version'
        }
    ])
    .then(answers => {
        if (!answers['cranver']) {
            console.log('Leaving compat API as is. Exiting.')
            return;
        }

        const file = fs.readFileSync(
            path.resolve(__dirname, '../src/api/routes/auth.api.ts'),
            'utf-8'
        );

        var updatedFile = file.replace(/\'([0-9.]+)\'/gm, `'${answers['cranver']}'`)

        fs.writeFileSync(
            path.resolve(__dirname, '../src/api/routes/auth.api.ts'),
            updatedFile,
            'utf-8'
        );

        console.log('Udpate complete.')
    })