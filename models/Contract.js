"use strict";

const req = require('../utils/req')

/**
 * Класс контракта к цели
 * @constructor
 */
function Contract (data) {
    let self = this
    data = data || {}
    
    /**
     * Атрибуты модели
     * @type {{owner: null, goal: null, duration: number, occupation: null, week_days: Array, month_days: Array, next_run: null, last_run: null, createdAt: null, updatedAt: null, ready: boolean}}
     */
    self.attributes = {
        owner: null,
        goal: null,
        key: '',
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
     * Сериализует экземпляр класса в JSON-объект
     *
     * @returns {string}
     */
    self.toJSON = () => {
        return JSON.stringify(self.attributes)
    }
    
    /**
     * Возвращает объект контракта по его идентификатору
     *
     * @param ctx - Контекст приложения
     * @param id - Идентификатор контракта
     * @returns {Promise.<*>}
     */
    self.findById = async(ctx, id) => {
        const ret = await req.make(ctx, '/contracts/' + id, {
            method: 'GET',
        }).then( response => {
            self.set(response)
            return true
        }).catch( reason => {
            console.error(reason)
            return false
        })
    
        return ret ? self : null
    }
    
    /**
     * Возвращает массив контрактов указанного или текущего пользователя
     *
     * @param ctx - Контекст приложения
     * @param user_id - ID указанного пользователя
     * @returns {Promise.<TResult|null>}
     */
    self.findByUser = async (ctx, user_id) => {
        const ret = await req.make(ctx, '/users/' + (user_id || ctx.session.user.get('id')) + '/contracts', {
            method: 'GET'
        }).then( response => {
            return response.map((contract) => (new Contract()).set(contract))
        }).catch( reason => {
            console.error(reason)
            return false
        })
    
        return ret || null
    }
    
    /**
     * Возвращает массив контрактов заданной цели
     *
     * @param ctx - Контекст приложения
     * @param id - Идентификатор заданной цели
     * @returns {Promise.<TResult|null>}
     */
    self.findByGoal = async (ctx, id) => {
        const ret = await req.make(ctx, '/goals/' + id + '/contracts', {
            method: 'GET',
        }).then( response => {
            return response.map((contract) => (new Contract()).set(contract))
        }).catch( reason => {
            console.error(reason)
            return false
        })
    
        return ret || null
    }
    
    /**
     * Возвращает контракт заданного пользователя к заданной цели
     *
     * @param ctx - Контекст приложения
     * @param goal - Идентификатор заданной цели
     * @param owner - Идентификатор заданного пользователя
     * @returns {Promise.<TResult>}
     */
    self.findByGoalAndOwner = async(ctx, goal, owner) => {
        return await req.make(ctx, '/contracts/' + goal + '/' + owner, {
            method: 'GET',
        }).then( response => {
            if (!response.error) {
                return self.set(response)
            } else {
                return null
            }
        }).catch( reason => {
            console.error(reason)
            return false
        })
    }
    
    /**
     * Обновляет флаг полноты записи / готовности к ее записи в БД
     *
     * @param ctx - Контекст приложения
     */
    self.updateReadyState = async(ctx) => {
        self.set({ready: (await self.validateFormat(ctx, self.get('occupation'))) !== null})
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
            await req.make(ctx, '/contracts/' + self.get('id'), Object.assign({}, self.get(), {
                method: 'PUT',
            })).then( response => {
                self.set(response)
            }).catch( reason => {
                console.error(reason)
                return false
            })
        } else {
            // Если не был определен айдишник - это вставка, используем метод POST
            await req.make(ctx, '/contracts', Object.assign({}, self.get(), {
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
    
    self.set(data)
    
    return self
}

console.log('🔸️  Contract model initiated')

module.exports = Contract;