"use strict";

const req = require('../utils/req')

/**
 * Класс контракта к цели
 * @constructor
 */
function Contract (data) {
    let self = this
    data = data || {}
    
    self.attributes = {
        owner: null,
        goal: null,
        duration: 0,
        occupation: null,
        week_days: [],
        month_days: [],
        next_run: null,
        last_run: null,
        createdAt: null,
        updatedAt: null,
        ready: false
    }
    
    /**
     *
     * @param data
     * @returns {Contract}
     */
    self.set = (data) => {
        self.attributes = Object.assign({}, self.attributes, data)
        return self
    }
    
    /**
     *
     * @param keys
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
     * Проверяет валидность введенной строки занятости:
     * XXm|h every (day|mon|tue|...|week|month|XX,XX)
     * Примеры:
     *   10m every day
     *   3h every sat,sun
     *   10h every week
     *
     * @param ctx
     * @param txt
     * @return {{}}
     */
    self.validateFormat = async(ctx, txt) => {
        // Отправляем запрос на валидацию строки контракта
        return await req.make(ctx, 'contracts/validate/' + encodeURIComponent(txt), {
            method: 'GET',
        }).then( (response) => response.data)
    }
    
    /**
     * Возвращает форматированную строку длительности
     *
     * @returns {string}
     */
    self.formatDuration = () => {
        const duration = self.get('duration')
        return duration ? (duration >= 60 ? (duration / 60) + 'h' : duration + 'min') : ''
    }
    
    /**
     * Возвращает строку параметров занятости по объекту их данных
     *
     * @returns {string}
     */
    self.toString = () => {
        const duration = self.get('duration')
        const week_days = self.get('week_days')
        const month_days = self.get('month_days')
        return duration && (week_days || month_days) ?
            (self.formatDuration()
                + ' every ' + (week_days.length > 0 ? (week_days.length === 7 ? 'day' : week_days.join(',')) : month_days.join(','))) : null
    }
    
    /**
     *
     * @returns {string}
     */
    self.toJSON = () => {
        return JSON.stringify(self.attributes)
    }
    
    /**
     *
     * @param ctx
     * @param id
     */
    self.findById = async(ctx, id) => {
        // Отправляем запрос на получение информаии о цели
        await req.make(ctx, '/contracts/' + id, {
            method: 'GET',
            
        }).then( (response) => {
            self.set(response)
        })
        
        return self
    }
    
    /**
     *
     * @param ctx
     * @param user_id
     */
    self.findByUser = async(ctx, user_id) => {
        // Отправляем запрос на получение информации о контрактах пользователя
        return await req.make(ctx, '/users/' + (user_id || ctx.session.user.get('id')) + '/contracts', {
            method: 'GET'
        }).then( (response) => {
            // конвертируем записи в объекты
            return response.map((contract) => (new Contract()).set(contract))
        })
    }
    
    /**
     *
     * @param ctx
     * @param id
     */
    self.findByGoal = async(ctx, id) => {
        // Отправляем запрос на получение информаии о цели
        return req.make(ctx, '/goals/' + id + '/contracts', {
            method: 'GET',
        }).then( (response) => {
            return response.map((contract) => (new Contract()).set(contract))
        })
    }
    
    /**
     *
     * @param ctx
     * @param goal
     * @param owner
     */
    self.findByGoalAndOwner = async(ctx, goal, owner) => {
        // Отправляем запрос на получение информаии о цели
        return await req.make(ctx, '/contracts/' + goal + '/' + owner, {
            method: 'GET',
        }).then( (response) => {
            if (!response.error) {
                return self.set(response)
            } else {
                return null
            }
        }).catch( (reason) => {
            return null
        })
    }
    
    /**
     *
     * @param ctx
     */
    self.updateReadyState = async(ctx) => {
        self.set({ready: (await self.validateFormat(ctx, self.get('occupation'))) !== null})
    }
    
    /**
     * Сохранение объекта в БД. Апдейт существующей записи или вставка новой
     * @param ctx
     */
    self.save = async(ctx) => {
        // Определяем данные для вставки или апдейта
        const data = self.get()
        data.owner = { id: ctx.session.user.get('id')}
        
        // Если был определен айдишник - это апдейт
        if (self.get('id') !== null && typeof self.get('id') !== 'undefined') {
            // Отправляем запрос на получение информаии о цели
            await req.make(ctx, '/contracts/' + self.get('id'), Object.assign({}, self.get(), {
                method: 'PUT',
            }))
            .then( (response) => {
                self.set(response)
            })
        // Если не был определен айдишник - это вставка
        } else {
            await req.make(ctx, '/contracts', Object.assign({}, self.get(), {
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

console.log('🔸️  Contract model initiated')

module.exports = Contract;