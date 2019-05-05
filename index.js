const key = require('./key.js');

const request  = require('request');
const jp = require('jsonpath');

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

async function getBattleData() {
    deaths =[];
    request('https://www.warcraftlogs.com:443/v1/reports/guild/chainless/frostwolf/eu?start=' + startDate + '&api_key=' + key.secret, {json: true}, (err, res, body) => {
        if (err) {
            console.log(err)
        }
        let reports = removeOverlaps(body);
        for (let reportnumber in reports) {
            let report = reports[reportnumber];
             request('https://www.warcraftlogs.com:443/v1/report/tables/deaths/' + report.id + '?end=' + (report.end - report.start) + '&encounter=-2&cutoff=2&api_key=' + key.secret, {json: true}, (err, res, body) => {
                if (err) {
                    console.log(err)
                }
                let players = new Set(jp.query(body, '$.entries[*].name'));
                players = Array.from(players);
                for (let key in players) {
                    let entry ={};
                    let player = players[key];
                    entry['name']=player
                    entry['deaths'] = jp.query(body, '$.entries[?(@.name==\'' + player + '\')].killingBlow.name');
                    deaths.push(entry);
                }
                console.log(deaths);
                console.log('huhu');
                console.log(deaths);

            });
        }


    });

}

module.exports.getBattleData =getBattleData;