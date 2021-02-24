"use strict";

const Base = require('./Base')
const req = require('../utils/req')
const User = require('./User')
const Contract = require('./Contract')
const errors = require('../errors')

/**
 * Класс цели
 * @constructor
 */
function Goal (data) {
    let self = this
    
    // Вызываем конструктор базовой модели
    Base.call(this)
    
    data = data || {}
    
    /**
     * Разделитель значений пользователя и кода в формате указания цели: ex.: "userName/goalName"
     * @type {string}
     */
    const ownerAndKeyDivider = '/'
    

    /**
     * Возвращает Telegram-ссылку для вывода текущей цели
     *
     * @returns {string}
     */
    self.getTGLink = () => {
        return (self.get('key') && self.get('key')!==''
            ? `/viewgoal ` + self.get('owner').email.replace(/@.+/, '')
                + `${ownerAndKeyDivider}${self.get('key')}`
            : `/viewgoal ${self.get('id').substr(0, process.env.GOAL_HASH_LENGTH)}`)
    }
    
    /**
     * Возвращает объект цели по ее идентификатору / пользователю и коду
     *
     * @param ctx - Контекст приложения
     * @param query - Запрос цели, содержащий пользователя и код
     * @returns {Promise.<*>}
     */
    self.find = async(ctx, query) => {
        const re = new RegExp('^(?<owner>[^' + ownerAndKeyDivider + '\\s]+)' + ownerAndKeyDivider + '(?<key>.+)$')
        const sub_matches = query.match(re)

        // Если запрос в виде <строка>/<строка> - считаем что это пользователь и код
        if (sub_matches && sub_matches.groups) {
            return await self.findByOwnerAndKey(ctx, sub_matches.groups)
        } else {
            // Если query начинается с решетки - пробуем найти строку в поле кода цели
            if (query.match(new RegExp('^(me|@me|my)?\\s*' + ownerAndKeyDivider + '.+'))) {
                return await self.findByOwnerAndKey(ctx, {
                    owner: ctx.session.user.get('email').replace(/@.+/, ''),
                    key: query.replace(new RegExp('^.*' + ownerAndKeyDivider), '')
                })
            }
            // Иначе если ровно GOAL_HASH_LENGTH символов - считаем что это часть ее _id
            else {
                return await self.findById(ctx, query)
            }
        }
    }
    
    /**
     * Возвращает объект цели по ее идентификатору
     *
     * @param ctx - Контекст приложения
     * @param id - Идентификатор цели
     * @returns {Promise.<*>}
     */
    self.findById = async (ctx, id) => {
        let result = { success: false }
        
        const response = await req.make(ctx, self.get('apiPath') + '/' + id, {
            method: 'GET'
        }).then( response => {
            self.set(response)
            result.success = true
            return true
        }).catch( reason => {
            result.error = Object.assign(
                { object: reason },
                errors.getByCode(1102) // Exception caught in model Goal::findById()
            )
            console.error(result.error.message)
            console.log(result.error.object)
            return false
        })
        if (response === true) {
            result = self
        }

        return result
    }
    
    /**
     * Возвращает массив всех целей выбранного или текущего пользователя
     *
     * @param ctx - Контекст приложения
     * @param user_id - Идентификатор пользователя
     * @returns {Promise.<*>}
     */
    self.findByUser = async (ctx, user_id) => {
        const apiPath = self.get('apiPath')
        
        let result = { success: false }
        
        if (!apiPath || apiPath === '') {
            result.error = errors.getByCode(1001) // Wrong or undefined apiPath
        } else {
            user_id = (user_id && user_id.id) || user_id || ctx.session.user.get('id')
            await req.make(ctx, '/users/' + user_id + '/goals', {
                method: 'GET'
            }).then( async response => {
                result.success = true
                result.items = response.items
                return true
            }).catch( reason => {
                result.error = Object.assign(
                    { object: reason },
                    errors.getByCode(1103) // Exception caught in model Goal::findByUser()
                )
                console.error(result.error.message)
                console.log(result.error.object)
                return false
            })
        }
        
        return result
    }
    
    /**
     * Возвращает объект цели по ее пользователю и коду
     *
     * @param ctx - Контекст приложения
     * @param data - Данные для выбора цели: {[owner: <int>, ]key: <string>}
     * @returns {Promise.<*>}
     */
    self.findByOwnerAndKey = async(ctx, data) => {
        let goals = []
        const owner = await (new User().findByEmail(ctx,
            (data.owner === 'me' ? ctx.session.user.get('email').replace(/@.+/, '') : data.owner) + '@t.me'))

        if (owner !== null) {
            goals = await self.findAll(ctx, owner.get('id'))
            goals = (goals || []).filter((goal) => {
                return goal.get('key') === data.key
            })
        } else {
            console.error('Ошибка. Пользователь ' + data.owner + ' не найден')
        }

        if (goals && goals.length === 1) {
            return goals[0]
        } else {
            console.error(ctx, 'Ошибка получения целей по параметрам', JSON.stringify(data))
            return null
        }
    }
    
    /**
     * Обновляет флаг полноты записи / готовности к ее записи в БД
     */
    self.updateReadyState = () => {
        self.set({ready:
            self.get('title') !== null && self.get('title') !== '' &&
            self.get('contract').get('ready') === true
        })
    }
    
    // Устанавливаем атрибуты модели, встроенные и переданные
    self.set(Object.assign({
        apiPath: '/goals',
        owner: null,
        key: '',
        title: '',
        deadline: null,
        description: '',
        contract: new Contract(),
        status: 'open',
        archived: null,
        completed: null,
        createdAt: null,
        updatedAt: null
    }, data))
    
    return self
}

// Наследуемся от базовой модели
Goal.prototype = Object.create(Base.prototype)
Goal.prototype.constructor = Goal

console.log('🔸️  Goal model initiated')

module.exports = Goal;