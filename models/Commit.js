"use strict";

const moment = require('moment')
const req = require('../utils/req')

/**
 * Класс коммита к контракту
 * @constructor
 */
function Commit (data) {
    let self = this
    data = data || {}
    
    self.attributes = {
        owner: null,
        contract: null,
        duration: 0,
        whats_next: null,
        whats_done: null,
        createdAt: null,
        updatedAt: null
    }
    
    /**
     * Регулярка разбора короткой команды: /commit [<owner>/]<code> <duration> "<whats_done>"[ "<whats_next>"]
     * Пример: /commit ewgeniyk/sg 1h 20min "Some fixes" "Finish /commit"
     * @type {RegExp}
     */
    self.re = /((?<owner>[^/\s]+)\/)?(?<code>[^\s]+)\s+((?<hours>\d+)\s*(h|hr)\s+)?((?<minutes>\d+)\s*(m|min)\s+)?("(?<whats_done>[^"]+)")\s*("(?<whats_next>[^"]+)")?$/
    
    /**
     * Регулярка разбора короткой команды: /commit [<owner>/]<code> <duration> "<whats_done>"[ "<whats_next>"]
     * Пример: /commit ewgeniyk/sg 1h 20min "Some fixes" "Finish /commit"
     * @type {RegExp}
     */
    self.dur_re = /^\s*((?<hours>\d+)\s*(h|hr)\s*)?((?<minutes>\d+)\s*(m|min))?\s*$/
    
    /**
     *
     * @param data
     * @returns {Commit}
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
     *
     * @returns {string}
     */
    self.toJSON = () => {
        return JSON.stringify(self.attributes)
    }
    
    /**
     *
     * @returns {string}
     */
    self.plain = () => {
        const data = JSON.parse(self.toJSON())
        data.contract = JSON.parse(data.contract)
        return data
    }
    
    /**
     * Возвращает объект строки длительности или нулл, если строка не проходит валидацию по регулярке
     *
     * @returns {{}|null}
     */
    self.validateDuration = (text) => {
        const duration = text.match(self.dur_re)
        return duration ? duration.groups : null
    }
    
    /**
     * Возвращает форматированную строку длительности
     *
     * @returns {string}
     */
    self.formatDuration = () => {
        const duration = self.get('duration')
        return duration ? (duration >= 60 ? Math.floor(duration / 60) + 'h' + (duration % 60 !== 0 ? ' ' + (duration % 60) + 'min' : '') : duration + 'min') : ''
    }
    
    /**
     *
     * @param ctx
     * @param user_id
     */
    self.findByUser = async(ctx, user_id) => {
        // Отправляем запрос на получение информации о контрактах пользователя
        return await req.make(ctx, '/users/' + user_id + '/commits', {
            method: 'GET'
        }).then( (response) => {
            let commits = response.map((commit) => (new Commit()).set(commit))
            commits = self.sortBy(commits, 'createdAt', false)
            return self.formatFields(commits)
        })
    }
    
    /**
     *
     * @param ctx
     * @param id
     */
    self.findById = async(ctx, id) => {
        // Отправляем запрос на получение информаии о цели
        await req.make(ctx, '/commits/' + id, {
            method: 'GET',
            
        }).then( (response) => {
            self.set(response)
        })
        
        return self
    }
    
    /**
     *
     * @param ctx
     * @param id
     */
    self.findByGoal = async(ctx, id) => {
        // Отправляем запрос на получение информаии о цели
        return req.make(ctx, '/goals/' + id + '/commits', {
            method: 'GET',
            
        }).then( (response) => {
            let commits = response.map((commit) => (new Commit()).set(commit))
            commits = self.sortBy(commits, 'createdAt', false)
            return self.formatFields(commits)
        })
    }
    
    /**
     * Форматирует поля коммитов
     *
     * @param commits
     * @returns {any[] | Array}
     */
    self.formatFields = (commits) => {
        return (commits || []).map((commit) => {
            commit.set({
                createdAt_human: moment(commit.get('createdAt')).format('DD.MM'),
                duration_human: commit.formatDuration('duration')
            })
            return commit
        })
    }
    
    /**
     * Форматирует поля коммитов
     *
     * @param commits
     * @param key
     * @param asc : true|false
     * @returns {any[] | Array}
     */
    self.sortBy = (commits, key, asc) => {
        return (commits || []).sort((a, b) => {
            const dateA = a.get(key || 'createdAt');
            const dateB = b.get(key || 'createdAt');
        
            let comparison = 0;
            if (dateA > dateB) {
                comparison = asc ? 1 : -1;
            } else if (dateA < dateB) {
                comparison = asc ? -1 : 1;
            }
            return comparison;
        })
    }
    
    /**
     *
     * @param ctx
     */
    self.updateReadyState = (ctx) => {
        self.set({
            ready: self.get('duration') && self.get('duration') !== 0 && self.get('duration') !== ''
                && self.get('whats_done') !== ''
        })
    }
    
    /**
     * Сохранение объекта в БД. Апдейт существующей записи или вставка новой
     * @param ctx
     */
    self.save = async(ctx) => {
        // Определяем данные для вставки или апдейта
        self.set({owner: { id: ctx.session.user.get('id')}})

        // Фиксируем текущую дату срабатывания в контракте и вычисляем следующую дату по контракту, сэйвим в контракт
        // const contract = self.get('contract')
        // contract.save(ctx)
        
        const data = self.plain()
        data.contract = { id: data.contract.id }
        
        // Если был определен айдишник - это апдейт
        if (self.get('id') !== null && typeof self.get('id') !== 'undefined') {
            // Отправляем запрос на получение информаии о цели
            await req.make(ctx, '/commits/' + self.get('id'), Object.assign({}, data, {
                method: 'PUT',
            }))
            .then( (response) => {
                self.set(response)
            })
        // Если не был определен айдишник - это вставка
        } else {
            await req.make(ctx, '/commits', Object.assign({}, data, {
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

console.log('🔸️  Commit model initiated')

module.exports = Commit;
