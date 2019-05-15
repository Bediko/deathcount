var express = require('express');
var router = express.Router();
const Table = require('table-builder');

/* GET home page. */
const key = require('../key.js');

const request  = require('request');
const jp = require('jsonpath');
const pug = require('pug');
const path = require('path');

let today = new Date();
let startDate = new Date().setDate(today.getDate()-30);
let deaths = [];
function removeOverlaps(reports){
    let filtered = [];
    let previousStart = today;
    for (let numberReport in reports){
        if(reports.hasOwnProperty(numberReport)) {
            let report = reports[numberReport];
            if (report.end < previousStart){
                filtered.push(report);
                previousStart = report.start;
            }
        }
    }
    return filtered;
}



router.get('/', function(req, res, next) {

    let deaths =[];
    let playernames = new Set();
    let deathnames = new Set();
    promise_reports = new Promise(function (resolve, reject) {

        request('https://www.warcraftlogs.com:443/v1/reports/guild/chainless/frostwolf/eu?start=' + startDate + '&api_key=' + key.secret, {json: true}, (err, res, body) => {
            if (err) {
                reject(err)
            }
            let reports = removeOverlaps(body);
            resolve(reports);
        });
    });
    promise_reports.catch(function(error) {
        console.log(error);
    });
    promise_reports.then(function (reports) {
        let promises=[];
        for (let reportnumber in reports) {

            if(reports.hasOwnProperty(reportnumber)) {
                let report = reports[reportnumber];
                let promise = new Promise(function (resolve, reject) {
                    //console.log('https://www.warcraftlogs.com:443/v1/report/tables/deaths/' + report.id + '?end=' + (report.end - report.start) + '&encounter=-2&cutoff=2&api_key=' + key.secret);
                    request('https://www.warcraftlogs.com:443/v1/report/tables/deaths/' + report.id + '?end=' + (report.end - report.start) + '&encounter=-2&cutoff=2&api_key=' + key.secret, {json: true}, (err, res, body) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(body);
                    });
                });
                promise.catch(function(error) {
                    console.log(error);
                });
                promises.push(promise);
            }

        }

        Promise.all(promises).then(function(entries){
            for (let entry in entries) {

                let players = new Set(jp.query(entries[entry], '$.entries[*].name'));
                players = Array.from(players);
                for (let key in players) {
                    let death = {};
                    let player = players[key];
                    playernames.add(player);
                    death['name'] = player;
                    death['deaths'] = jp.query(entries[entry], '$.entries[?(@.name==\'' + player + '\')].killingBlow.name');
                    if (death['deaths'].length === 0){
                        death['deaths'] = ['broken report'];
                    }
                    for (let key in death['deaths']){
                        deathnames.add(death['deaths'][key]);
                    }

                    deaths.push(death);
                }
            }
            playernames = Array.from(playernames);
            deathnames = Array.from(deathnames);
            playernames.sort();
            let tabledata =[];
            for (let player in playernames){
                let row={};
                row['name']=playernames[player];
                row['total']=0;
                for(let death in deathnames){
                    row[deathnames[death]] =0;
                }
                tabledata.push(row);
            }
            let rowtotal={};
            rowtotal['name']='total';
            rowtotal['total']=0;
            for(let death in deathnames){
                rowtotal[deathnames[death]] =0;
            }

            for (let row in tabledata){
                for(let player in deaths){
                    if(tabledata[row]['name']===deaths[player]['name']){
                        for(let death in deaths[player]['deaths']) {
                            tabledata[row]['total']+=1;
                            tabledata[row][deaths[player]['deaths'][death]] +=1;
                            rowtotal['total'] +=1;
                            rowtotal[deaths[player]['deaths'][death]] += 1;
                        }
                    }
                }
            }


            tabledata.push(rowtotal);
            tabledata.sort(function(a,b){return a['total']-b['total']})
            let totaldeaths = rowtotal['total'];
            delete rowtotal['name'];
            delete rowtotal['total'];
            let sorteddeaths=[];
            for(let key in rowtotal)
                if(rowtotal.hasOwnProperty(key))
                    sorteddeaths.push([key, rowtotal[key]]);
            sorteddeaths.sort(function(a, b)
            {
                return -(a[1]-b[1]);
            });



            let headers = {'name':'name','total':'total'};
            for (let i = 0; i < sorteddeaths.length; i++) {
                let key = sorteddeaths[i][0];
                headers[key] = key;
            }
            rowtotal['name']= 'total';
            rowtotal['total']= totaldeaths;


            let table = new Table().setHeaders(headers).setData(tabledata);
            let output ='<!DOCTYPE html><html><head><link rel=\"stylesheet\" href=\"/stylesheets/style.css\"></head><body>'+table.render()+'</body></html>';
            res.send(output);
        }).catch(function(error){
            console.log(error);
            console.trace();
        });

    }).catch(function(error){
        console.log('promise_reports');
        console.log(error)});

});

module.exports = router;
