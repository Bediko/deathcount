const key = require('./key.js');

const request  = require('request');
const jp = require('jsonpath');

let today = new Date();
let startDate = new Date().setDate(today.getDate()-30);

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


request('https://www.warcraftlogs.com:443/v1/reports/guild/chainless/frostwolf/eu?start='+startDate+'&api_key='+key.secret, {json:true}, (err, res, body)=> {
    if (err) {
        console.log(err)
    }
    let reports = removeOverlaps(body);
    //for (let reportnumber in reports){
        let report = reports[0];
        request('https://www.warcraftlogs.com:443/v1/report/tables/deaths/'+report.id+'?end='+(report.end-report.start)+'&encounter=-2&cutoff=2&api_key='+key.secret, {json:true}, (err, res, body)=> {
            if (err) {
                console.log(err)
            }
            let players = new Set(jp.query(body,'$.entries[*].name'));
            players = Array.from(players);
            for (let key in players){
                let player=players[key];
                let deaths = {};
                deaths[player]= jp.query(body,'$.entries[?(@.name==\''+player+'\')].killingBlow.name');
                console.log(deaths);
            }



        })
    //}
});