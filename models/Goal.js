"use strict";

const moment = require('moment')
const req = require('../utils/req')
const User = require('./User')
const Contract = require('./Contract')

/**
 * Класс цели
 * @constructor
 */
function Goal (data) {
    let self = this
    data = data || {}
    
    /**
     * Разделитель значений пользователя и кода в формате указания цели: ex.: "userName/goalName"
     * @type {string}
     */
    const ownerAndKeyDivider = '/'
    
    /**
     * Атрибуты модели
     * @type {{owner: null, key: string, title: string, description: string, contract: Contract, archived: null, completed: null, createdAt: null, updatedAt: null}}
     */
    self.attributes = {
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
    }
    
    /**
     * Задает значения одному или нескольким указанным полям
     *
     * @param data - Объект ключей и их значений
     * @returns {Goal}
     */
    self.set = (data) => {
        self.attributes = Object.assign({}, self.attributes, data)
        return self
    }
    
    /**
     * Возвращает значение одного указанного поля в заданном виде или объект из значений по массиву указанных ключей
     *
     * @param keys - Строка ключа или массив ключей
     * @returns {*}
     */
    self.get = (keys) => {
        return keys && typeof keys !== 'undefined'
            ? (typeof keys === 'string'
                ? self.attributes[keys]
                : keys.reduce((obj, key) => ({ ...obj, [key]: self.attributes[key] }), {})
            )
            : self.attributes
    }
    
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
     * Сериализует экземпляр класса в JSON-объект
     *
     * @returns {string}
     */
    self.toJSON = () => {
        return JSON.stringify(self.attributes)
    }
    
    /**
     * Возвращает массив всех целей выбранного или текущего пользователя
     *
     * @param ctx - Контекст приложения
     * @param user_id - Идентификатор пользователя
     * @returns {Promise.<*>}
     */
    self.findAll = async(ctx, user_id) => {
        user_id = (user_id && user_id.id) || user_id || ctx.session.user.get('id')
        const ret = await req.make(ctx, '/users/' + user_id + '/goals', {
            method: 'GET'
        }).then(async(response) => {
            let goals = [], goal
            if (!response || response.length === 0) {
                console.error('Нет целей')
                return null
            } else {
                for (let i = 0; i < response.length; i++) {
                    goal = (new Goal()).set(response[i])
                    goal.set({
                        createdAt_human: moment(goal.get('createdAt')),
                        updatedAt_human: moment(goal.get('updatedAt')),
                        deadlineAt_human: goal.get('deadlineAt') ? moment(goal.get('deadlineAt')) : null,
                        contract: await (new Contract())
                            .findByGoalAndOwner(ctx, goal.get('id'), user_id)
                    })
                    goals.push(goal)
                }
            }
            return goals
        }).catch( reason => {
            console.error(reason)
            return false
        })
        
        return ret || null
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
     * @param user - Объект пользователя для определения поля текущего или указанного пользователя
     * @returns {Promise.<*>}
     */
    self.findById = async (ctx, id, user) => {
        const ret = await req.make(ctx, '/goals/' + id, {
            method: 'GET'
        }).then( response => {
            self.set(response)
            return true
        }).catch( reason => {
            console.error(reason)
            return false
        })
        if (ret !== false) {
            return self.set({
                createdAt_human: moment(self.get('createdAt')),
                updatedAt_human: moment(self.get('updatedAt')),
                contract: await (new Contract()).findByGoalAndOwner(ctx, self.get('id'), (user || ctx.session.user).get('id')),
                contracts: await (new Contract()).findByGoal(ctx, self.get('id'))
            })
            if (self.get('deadlineAt')) {
                self.set({
                    deadlineAt_human: moment(self.get('deadlineAt')),
                    percent_completed: moment().diff(self.get('createdAt')) / moment(self.get('deadlineAt')).diff(self.get('createdAt')) * 100
                })
            }
            return self
        } else {
            return null
        }
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
    
    /**
     * Сохраняет объект в БД. Апдейтит существующую запись или вставляет новую в зависимости от поля self.id
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<Goal>}
     */
    self.save = async(ctx) => {
        // Определяем данные для вставки или апдейта
        const data = self.get()
        data.owner = { id: ctx.session.user.get('id')}

        if (self.get('id') !== null && typeof self.get('id') !== 'undefined') {
            // Если был определен айдишник - это апдейт, используем метод PUT
            await req.make(ctx, '/goals/' + self.get('id'), Object.assign({}, self.get(), {
                method: 'PUT',
            })).then( response => {
                self.set(response)
            }).catch( reason => {
                console.error(reason)
                return false
            })
        } else {
            // Если не был определен айдишник - это вставка, используем метод POST
            await req.make(ctx, '/goals', Object.assign({}, self.get(), {
                method: 'POST',
            })).then( response => {
                self.set(response)
            }).catch( reason => {
                console.error(reason)
                return false
            })
        }
        
        return self
    }
    
    // Устанавливаем переданные в конструктор опции
    self.set(data)
    
    return self
}

console.log('🔸️  Goal model initiated')

module.exports = Goal;