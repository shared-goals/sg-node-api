"use strict";

const req = require('../utils/req')
const errors = require('../errors')

function Base (data) {
    let self = this
    
    /**
     * Атрибуты модели
     * @type {{}}
     */
    self.attributes = {
        apiPath: null
    }
    
    /**
     * Задает значения одному или нескольким указанным полям
     *
     * @param data - Объект ключей и их значений
     * @returns {Base}
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
     * Сортирует массив объектов по какому-то ключевому полю
     *
     * @param items - Массив объектов
     * @param key - Ключ сортировки, по умолчанию createdAt
     * @param dir - Направление сортировки : 'asc', default - по возрастанию или 'desc' - по убыванию
     * @returns {Array}
     */
    self.sortItems = (items, key, dir) => {
        return (items || []).sort((a, b) => {
            const dateA = a.get(key || 'createdAt')
            const dateB = b.get(key || 'createdAt')
            
            let comparison = 0
            if (dateA > dateB) {
                comparison = dir === 'asc' ? 1 : -1
            } else if (dateA < dateB) {
                comparison = dir === 'asc' ? -1 : 1
            }
            return comparison
        })
    }
    
    /**
     * Возвращает объект модели по его идентификатору
     *
     * @param ctx - Контекст приложения
     * @param id - Идентификатор объекта модели
     * @returns {Promise.<*>}
     */
    self.findById = async(ctx, id) => {
        const apiPath = self.get('apiPath')

        let result = { success: false }

        if (!apiPath || apiPath === '') {
            result.error = errors.getByCode(1001) // Wrong or undefined apiPath
        } else {
            const response = await req.make(ctx, apiPath + '/' + id, {
                method: 'GET',
            }).then( response => {
                self.set(response)
                return true
            }).catch( reason => {
                result.error = Object.assign(
                    { object: reason },
                    errors.getByCode(1002) // Exception caught in model Base::findById()
                )
                console.error(result.error.message)
                console.log(result.error.object)
                return false
            })
            if (response === true) {
                result = self
            }
        }
        
        return result
    }
    
    /**
     * Возвращает все имеющиеся объекты модели
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<*>}
     */
    self.findAll = async (ctx) => {
        const apiPath = self.get('apiPath')
    
        let result = { success: false }
    
        if (!apiPath || apiPath === '') {
            result.error = errors.getByCode(1001) // Wrong or undefined apiPath
        } else {
            await req.make(ctx, apiPath + '/', {
                method: 'GET'
            }).then( response => {
                result.success = true
                result.items = []
                for (let i = 0; i < response.length; i++) {
                    result.items.push((new self.constructor).set(response[i]))
                }
                return true
            }).catch( reason => {
                result.error = Object.assign(
                    { object: reason },
                    errors.getByCode(1003) // Exception caught in model Base::search()
                )
                console.error(result.error.message)
                console.log(result.error.object)
                return false
            })
        }
    
        return result
    }
    
    /**
     * Возвращает массив всех объектов в соответствии с текстовым запросом
     *
     * @param ctx - Контекст приложения
     * @param query - Текстовый запрос
     * @param opts - Опции поиска
     * @returns {Promise.<*>}
     */
    self.search = async (ctx, query, opts) => {
        const apiPath = self.get('apiPath')
    
        let result = { success: false }
    
        if (!apiPath || apiPath === '') {
            result.error = errors.getByCode(1001) // Wrong or undefined apiPath
        } else {
            await req.make(ctx, apiPath + '/search/' + query, {
                method: 'GET'
            }).then( async (response) => {
                result.success = true
                result.items = []
                for (let i = 0; i < response.length; i++) {
                    result.items.push((new self.constructor).set(response[i]))
                }
                return true
            }).catch( reason => {
                result.error = Object.assign(
                    { object: reason },
                    errors.getByCode(1003) // Exception caught in model Base::search()
                )
                console.error(result.error.message)
                return false
            })
        }

        return result
    }
    
    /**
     * Сохраняет объект в БД. Апдейтит существующую запись или вставляет новую в зависимости от поля self.id
     *
     * @param ctx - Контекст приложения
     * @returns {Promise.<*>}
     */
    self.save = async(ctx) => {
        const apiPath = self.get('apiPath')
    
        let result = { success: false }
    
        if (!apiPath || apiPath === '') {
            result.error = errors.getByCode(1001) // Wrong or undefined apiPath
        } else {
            // Определяем данные для вставки или апдейта
            const data = self.get()
            data.owner = { id: ctx.session.user.get('id')}
    
            if (self.get('id') !== null && typeof self.get('id') !== 'undefined') {
                // Если был определен айдишник - это апдейт, используем метод PUT
                await req.make(ctx, self.get('apiPath') + '/' + self.get('id'), Object.assign({}, self.get(), {
                    method: 'PUT',
                })).then( response => {
                    result.success = true
                    self.set(response)
                    return true
                }).catch( reason => {
                    result.error = Object.assign(
                        { object: reason },
                        errors.getByCode(1004) // Exception caught in model Base::save()
                    )
                    console.error(result.error.message)
                    return false
                })
            } else {
                // Если не был определен айдишник - это вставка, используем метод POST
                await req.make(ctx, self.get('apiPath'), Object.assign({}, self.get(), {
                    method: 'POST',
                })).then( response => {
                    result.success = true
                    self.set(response)
                    return true
                }).catch( reason => {
                    result.error = Object.assign(
                        { object: reason },
                        errors.getByCode(1004) // Exception caught in model Base::save()
                    )
                    console.error(result.error.message)
                    return false
                })
            }
        }
    
        return self
    }
    
    // Устанавливаем атрибуты модели, встроенные и переданные
    self.set(data || {})
    
    return self
}
module.exports = Base