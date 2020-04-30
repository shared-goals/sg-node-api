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
    const ownerAndCodeDivider = '/'
    
    //
    self.attributes = {
        owner: null,
        code: '',
        title: '',
        description: '',
        contract: new Contract(),
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
        return (self.get('code') && self.get('code')!==''
            ? `/viewgoal ` + self.get('owner').email.replace(/@.+/, '')
                + `${ownerAndCodeDivider}${self.get('code')}`
            : `/viewgoal ${self.get('id').substr(0, process.env.GOAL_HASH_LENGTH)}`)
    }
    
    self.toJSON = () => {
        return JSON.stringify(self.attributes)
    }
    
    /**
     * Возвращает объект всех целей выбранного или текущего пользователя
     *
     * @param ctx - Контекст приложения
     * @param user_id
     * @returns {*}
     */
    self.findAll = async(ctx, user_id) => {
        user_id = (user_id.id || user_id || ctx.state.user.get('id'))
        return await req.make(ctx, '/users/' + user_id + '/goals', {
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
        })
    }
    
    /**
     * Возвращает объект цели по ее идентификатору / пользователю и коду
     *
     * @param ctx - Контекст приложения
     * @param id
     */
    self.find = async(ctx, query) => {
        const re = new RegExp('^(?<owner>[^' + ownerAndCodeDivider + '\\s]+)' + ownerAndCodeDivider + '(?<code>.+)$')
        const sub_matches = query.match(re)

        // Если запрос в виде <строка>/<строка> - считаем что это пользователь и код
        if (sub_matches && sub_matches.groups) {
            return await self.findByOwnerAndCode(ctx, sub_matches.groups)
        } else {
            // Если query начинается с решетки - пробуем найти строку в поле кода цели
            if (query.match(new RegExp('^(me|@me|my)?\\s*' + ownerAndCodeDivider + '.+'))) {
                return await self.findByOwnerAndCode(ctx, {
                    owner: ctx.session.SGUser.get('email').replace(/@.+/, ''),
                    code: query.replace(new RegExp('^.*' + ownerAndCodeDivider), '')
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
     * @param id
     * @param user
     */
    self.findById = async (ctx, id, user) => {
        // Отправляем запрос на получение информаии о цели
        const ret = await req.make(ctx, '/goals/' + id, {
            method: 'GET'
        }).then( (response) => {
            return self.set(response)
        }).catch((reason) => {
            console.error(reason)
            return false
        })
        if (ret !== false) {
            return self.set({
                createdAt_human: moment(self.get('createdAt')),
                updatedAt_human: moment(self.get('updatedAt')),
                deadlineAt_human: self.get('deadlineAt') ? moment(self.get('deadlineAt')) : null,
                contract: await (new Contract()).findByGoalAndOwner(ctx, self.get('id'), (user || ctx.state.user).get('id')),
                contracts: await (new Contract()).findByGoal(ctx, self.get('id'))
            })
        } else {
            return null
        }
    }
    
    /**
     * Возвращает объект цели по ее пользователю и коду
     *
     * @param ctx - Контекст приложения
     * @param data - Данные для выбора цели: {[owner: <int>, ]code: <string>}
     */
    self.findByOwnerAndCode = async(ctx, data) => {
        let goals = []
        const owner = await (new User().findByEmail(ctx,
            (data.owner === 'me' ? ctx.state.user.get('email').replace(/@.+/, '') : data.owner) + '@t.me'))

        if (owner !== null) {
            goals = await self.findAll(ctx, owner.get('id'))
            goals = (goals || []).filter((goal) => {
                return goal.get('code') === data.code
            })
        } else {
            console.error(ctx, 'Ошибка. Пользователь ' + data.owner + ' не найден')
            ctx.reply('Ошибка. Пользователь ' + data.owner + ' не найден')
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
     * Сохранение объекта в БД. Апдейт существующей записи или вставка новой
     *
     * @param ctx - Контекст приложения
     */
    self.save = async(ctx) => {
        // Определяем данные для вставки или апдейта
        const data = self.get()
        data.owner = { id: ctx.session.SGUser.get('id')}

        // Если был определен айдишник - это апдейт
        if (self.get('id') !== null && typeof self.get('id') !== 'undefined') {
            // Отправляем запрос на получение информаии о цели
            await req.make(ctx, '/goals/' + self.get('id'), Object.assign({}, self.get(), {
                method: 'PUT',
            }))
            .then( (response) => {
                self.set(response)
            })
        // Если не был определен айдишник - это вставка
        } else {
            await req.make(ctx, '/goals', Object.assign({}, self.get(), {
                method: 'POST',
            }))
            .then( (response) => {
                self.set(response)
            })
        }
        
        return self
    }
    
    self.set(data)
    
    return self
}

console.log('🔸️  Goal model initiated')

module.exports = Goal;