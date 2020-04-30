"use strict";

const req = require('../utils/req')

/**
 * Класс текущего пользователя
 * @constructor
 */
function User (data) {
    let self = this
    data = data || {}
    
    self.attributes = {
        id: null,
        createdAt: null,
        updatedAt: null,
        language: 'ru',
        username: '',
        email: '',
        password: '',
        name: '',
        telegram_id: null
    }
    
    self.set = (data) => {
        self.attributes = Object.assign({}, self.attributes, data)
        return self
    }
    
    self.get = (keys) => {
        return keys && typeof keys !== 'undefined'
            ? (typeof keys === 'string'
                ? self.attributes[keys]
                : keys.reduce((obj, key) => ({ ...obj, [key]: self.attributes[key] }), {})
            )
            : self.attributes
    }
    
    self.toJSON = () => {
        return JSON.stringify(self.attributes)
    }
    
    self.findAll = async(ctx) => {
        // Отправляем запрос на получение информаии о пользователях
        return await req.make(ctx, 'users', {
            method: 'GET'
        }).then(async(response) => {
            let users = []
            if (!response || response.length === 0) {
                console.error(ctx, 'Нет пользователей')
                return null
            } else {
                for (let i = 0; i < response.length; i++) {
                    users.push((new User()).set(response[i]))
                }
            }
            console.log(users)
            return users
        })
    }
    
    self.findById = async(ctx, id) => {
        // Отправляем запрос на получение информаии о пользователе
        let url
        if (id === parseInt(id, 10)) {
            if (id) {
                url = 'users/' + id
            } else {
                url = 'users/email/' + id + '@t.me'
            }
            await req.make(ctx, url, {
                method: 'GET'
            }).then( (response) => {
                self.set(response)
            })
        }
        
        return self
    }
    
    self.findByEmail = async(ctx, email) => {
        // Отправляем запрос на получение информаии о пользователе
        const ret = await req.make(ctx, 'users/email/' + encodeURIComponent(email), {
            method: 'GET'
        }).then( (response) => {
            self.set(response)
            return true
        }).catch( () => {
            return false
        })
        
        return ret ? self : null
    }
    
    self.set(data)
    
    return self
}

console.log('🔸️  User model initiated')

module.exports = User;
