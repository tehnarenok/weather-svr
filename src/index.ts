import express, {Request, Response} from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import fetch from 'node-fetch'
import crypto from 'crypto'
import redis from 'redis'
import url from 'url-parse'

const app = express()

const API_KEY : string = process.env.API_KEY
const API_URL : string = process.env.API_URL


const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT , 10),
})

app.get('/api/', (req, res) => {
    res.send('Hello')
})

app.use(cookieParser())
app.use(cors())

app.use('/api/', (req, res, next) => {
    if(req.headers.token && req.headers.token !== '') {
        client.hget('client', req.headers.token.toString(), (err, reply) => {
            if(err) {
                console.log(err)
                res.status(400)
            } else {
                if(reply) {
                    res.header('Access-Control-Expose-Headers', 'TOKEN')
                    res.header('TOKEN', req.headers.token)
                    next()
                } else {
                    crypto.randomBytes(64, (ex, buf) => {
                        const token = buf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
                        req.headers.token = token
                        res.header('TOKEN', token)
                        res.header('Access-Control-Expose-Headers', 'TOKEN')
                        client.hset('client', token, '[]')
                        next()
                    })
                }
            }
        })
        
    } else {
        crypto.randomBytes(64, (ex, buf) => {
            const token = buf.toString('base64').replace(/\//g, '_').replace(/\+/g, '-')
            req.headers.token = token
            res.header('TOKEN', token)
            res.header('Access-Control-Expose-Headers', 'TOKEN')
            client.hset('client', token, '[]')
            next()
        })
    }
})

const parseApiRequest = (data) => {
    const result = {
        city: data.city_name,
        img: `https://www.weatherbit.io/static/img/icons/${data.weather.icon}.png`,
        params: [
            {name: 'Ветер', value: `${data.wind_spd.toFixed(1)} м/с, ${data.wind_cdir_full}`},
            {name: 'Облачность', value: `${data.clouds.toFixed(1)} %`},
            {name: 'Давление', value: `${data.pres.toFixed(1)} мб`},
            {name: 'Влажность', value: `${data.rh.toFixed(1)} %`},
            {name: 'Координаты', value: `[${data.lat.toFixed(3)}, ${data.lon.toFixed(3)}]`},
        ],
        temp: `${data.temp.toFixed(1)} °C`,
    }
    return result
}

app.get('/api/favs/get', (req, res) => {
    const token = req.headers.token?.toString()
    client.hget('client', token, (err, reply) => {
        if(err) {
            console.log(err)
            res.status(500).end()
            return
        }

        res.json(JSON.parse(reply)).end()
    })
})

app.get('/api/favs/set', (req, res) => {
    const cities = JSON.parse(req.query.cities?.toString() || '[]')
    const token = req.headers.token?.toString()

    client.hset('client', token, JSON.stringify(cities), (err, reply) => {
        if(err) {
            console.log(err)
            res.status(500).end()
        } else {
            console.log('OK')
            res.status(200).end()
        }
    })
})

app.get('/api/current/city', (request: Request, response: Response) => {
    console.log(`${API_URL}city=${encodeURIComponent(request.query.city.toString())}&key=${API_KEY}`)
    fetch(`${API_URL}city=${encodeURIComponent(request.query.city.toString())}&key=${API_KEY}`)
        .then(res => {
            if(res.status === 204) {
                response.status(404).end()
                return
            }
            return res.json()
        })
        .then(data => {
            if(data.error || data.count !== 1) {
                response.status(404).end()
            } else {
                response.json(parseApiRequest(data.data[0]))
            }
        })
        .catch(err => {
            console.log(err)
            response.status(500).end()
        })
})

app.get('/api/current/coord', (request: Request, response: Response) => {
    fetch(`${API_URL}lat=${encodeURIComponent(request.query.lat.toString())}&lon=${encodeURIComponent(request.query.lon.toString())}&key=${API_KEY}`)
        .then(res => {
            if(res.status === 204) {
                response.status(404).end()
                return
            }
            return res.json()
        })
        .then(data => {
            if(data.error || data.count !== 1) {
                response.status(404).end()
            } else {
                response.json(parseApiRequest(data.data[0]))
            }
        })
        .catch(err => {
            console.log(err)
            response.status(500).end()
        })
})

app.listen(8000, () => {
    console.log('listen')
})
