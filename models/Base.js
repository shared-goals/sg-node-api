"use strict";

const req = require('../utils/req')

function Base () {
    let self = this
    
    /**
     * Атрибуты модели
     * @type {{}}
     */
    self.attributes = {
        apiPath: ''
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
     * Сериализует экземпляр класса в JSON-строку
     *
     * @returns {string}
     */
    self.toJSON = () => {
        return JSON.stringify(self.attributes)
    }
    
    /**
     * Возвращает объект модели по его идентификатору
     *
     * @param ctx - Контекст приложения
     * @param id - Идентификатор объекта модели
     * @returns {Promise.<*>}
     */
    self.findById = async(ctx, id) => {
        const ret = await req.make(ctx, self.get('apiPath') + '/' + id, {
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
     * Сортирует массив объектов по какому-то ключевому полю
     *
     * @param commits - Массив объектов
     * @param key - Ключ сортировки, по умолчанию createdAt
     * @param asc - Направление сортировки : true (по возрастанию) или false (по убыванию)
     * @returns {Array.<T>}
     */
    self.sortBy = (commits, key, asc) => {
        return (commits || []).sort((a, b) => {
            const dateA = a.get(key || 'createdAt')
            const dateB = b.get(key || 'createdAt')
            
            let comparison = 0
            if (dateA > dateB) {
                comparison = asc ? 1 : -1
            } else if (dateA < dateB) {
                comparison = asc ? -1 : 1
            }
            return comparison
        })
    }
    
    return self
}
module.exports = Base