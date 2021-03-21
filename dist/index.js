"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
const redis_1 = __importDefault(require("redis"));
const app = express_1.default();
const API_KEY = "436d1a96e5cb42e294ec78b059ab8e71";
const API_URL = "https://api.weatherbit.io/v2.0/current?lang=ru&";
const client = redis_1.default.createClient();
app.get('/', (req, res) => {
    res.send('Hello');
});
app.use(cookie_parser_1.default());
app.use(cors_1.default());
app.use('/', (req, res, next) => {
    if (req.headers.token && req.headers.token !== '') {
        res.header('Access-Control-Expose-Headers', 'TOKEN');
        res.header('TOKEN', req.headers.token);
        next();
    }
    else {
        console.log('----------------------------------------------');
        crypto_1.default.randomBytes(64, (ex, buf) => {
            const token = buf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
            req.headers.token = token;
            res.header('TOKEN', token);
            res.header('Access-Control-Expose-Headers', 'TOKEN');
            client.hset('client', token, '[]');
            next();
        });
    }
});
const parseApiRequest = (data) => {
    const result = {
        city: data.city_name,
        img: `https://www.weatherbit.io/static/img/icons/${data.weather.icon}.png`,
        params: [
            { name: 'Ветер', value: `${data.wind_spd.toFixed(1)} м/с, ${data.wind_cdir_full}` },
            { name: 'Облачность', value: `${data.clouds.toFixed(1)} %` },
            { name: 'Давление', value: `${data.pres.toFixed(1)} мб` },
            { name: 'Влажность', value: `${data.rh.toFixed(1)} %` },
            { name: 'Координаты', value: `[${data.lat.toFixed(3)}, ${data.lon.toFixed(3)}]` },
        ],
        temp: `${data.temp.toFixed(1)} °C`,
    };
    return result;
};
app.get('/favs/get', (req, res) => {
    var _a;
    const token = (_a = req.headers.token) === null || _a === void 0 ? void 0 : _a.toString();
    client.hget('client', token, (err, reply) => {
        if (err) {
            console.log(err);
            res.status(400).end();
            return;
        }
        res.json(JSON.parse(reply)).end();
    });
});
app.get('/favs/set', (req, res) => {
    var _a, _b;
    const cities = JSON.parse(((_a = req.query.cities) === null || _a === void 0 ? void 0 : _a.toString()) || '[]');
    const token = (_b = req.headers.token) === null || _b === void 0 ? void 0 : _b.toString();
    client.hset('client', token, JSON.stringify(cities), (err, reply) => {
        if (err) {
            console.log(err);
            res.status(400);
        }
        else {
            res.status(200);
        }
    });
});
app.get('/current/city', (request, response) => {
    node_fetch_1.default(`${API_URL}city=${encodeURIComponent(request.query.city.toString())}&key=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
        if (data.error || data.count !== 1) {
            response.status(400).end();
        }
        else {
            response.json(parseApiRequest(data.data[0]));
        }
    })
        .catch(err => {
        response.status(400).end();
    });
});
app.get('/current/coord', (request, response) => {
    node_fetch_1.default(`${API_URL}lat=${encodeURIComponent(request.query.lat.toString())}&lon=${encodeURIComponent(request.query.lon.toString())}&key=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
        if (data.error || data.count !== 1) {
            response.status(500).end();
        }
        else {
            response.json(parseApiRequest(data.data[0]));
        }
    })
        .catch(err => {
        console.log(err);
        response.status(400).end();
    });
});
app.listen(8000, () => {
    console.log('listen');
});
//# sourceMappingURL=index.js.map