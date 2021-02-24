"use strict";

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
exports.weekdays = weekdays
exports.short_weekdays = weekdays.map((item) => item.substr(0, 3))

/**
 * Pauses execution for given amount of seconds
 * @param sec - amount of seconds
 */
function sleep(sec) {
    return new Promise(resolve => setTimeout(resolve, sec * 1000))
}

exports.sleep = sleep

/**
 * Checks whether given number is in range of base plus/minus step
 * @param number - number to check
 * @param base - base number to compare with
 * @param step - range for a number
 */
function isNumberInRage(number, base, step = 1) {
    return number >= base - step && number <= base + step
}

exports.isNumberInRage = isNumberInRage

/**
 *
 * @param ctx - Объект контекста
 * @param text
 * @param shortcuts
 * @returns {boolean}
 */
const checkShortcuts = async(ctx, text, shortcuts) => __awaiter(this, void 0, void 0, function* () {
    const keys = Object.keys(shortcuts || {})
    let pattern
    let ret
    let match
    for (let i = 0; i < keys.length; i++) {
        pattern = keys[i]
        match = text.match(new RegExp(pattern))
        if (match !== null) {
            // logger.default.debug(ctx, 'Detected shortcut:', pattern, ', calling handler')
            ret = yield shortcuts[pattern].handler(ctx, match.groups && match.groups.params || text)
        }
    }
    return ret
})

exports.checkShortcuts = checkShortcuts

/**
 * Flatten a deep object into a one level object with it’s path as key
 *
 * @param  {object} object - The object to be flattened
 * @return {object}        - The resulting flat object
 */
const flatten = object => {
    return Object.assign( {}, ...function _flatten( objectBit, path = '' ) { // spread the result into our return object
        return [].concat(                                                    // concat everything into one level
            ...Object.keys( objectBit ).map(                                 // iterate over object
                key => typeof objectBit[ key ] === 'object' ?                // check if there is a nested object
                    _flatten( objectBit[ key ], `${ path }/${ key }` ) :     // call itself if there is
                    ( { [ `${ path }/${ key }` ]: objectBit[ key ] } )       // append object with it’s path as key
            )
        )
    }( object ) );
}

exports.flatten = flatten

/**
 * Создает на основе объекта произвольной вложенности список дата-атрибутов с соответствующими именами,
 * содержащими дерево ключей каждого объекта в виде списка, разделенного "-"
 * Например:
 *   > JSON.stringify(magickDataFlatten({a: {b: {c: 1}, d: 2}}, {prefix: 'data-'}))
 *   output: {"data-a-b-c":1,"data-a-d":2}
 *
 * @param {Object} obj Исходный объект
 * @param {Object} opts Опции обработки объекта
 * @returns {Object} Результирующий список данных одного уровня
 * @private
 */
const magickDataFlatten = (obj, opts) => {
    opts = opts || {}
    const arr = {}
    const parkey = (opts.parkey ? opts.parkey + (opts.divider || '-') : '')
    for (let key in obj) {
        if ((typeof obj[key]).toLowerCase() === 'object') {
            Object.assign(arr, magickDataFlatten(obj[key], Object.assign({}, opts, {parkey: parkey + key})))
        } else {
            arr[(opts.prefix || '') + parkey + key] = obj[key]
        }
    }
    return arr
}

exports.magickDataFlatten = magickDataFlatten

/**
 * Рекурсивно модифицирует заданный объект, создавая поля по ключам, соответствующим заданному списку.
 * При указанных опциях forceFill и fillValue - заполняет конечные создаваемые элементы объекта заданным
 * значением. Например:
 *   > let o = {}; createChildsFromKeysArr(o, ['a', 'b', 'd'], {forceFill: true, fillValue: 5});
 *   > JSON.stringify(o)
 *   output: {"a":{"b":{"d":5}}}"
 *   > let o = {a: {b: 0}}; createChildsFromKeysArr(o, ['a', 'c']); JSON.stringify(o)
 *   output: {"a":{"b":0,"c":null}}
 *
 * @param {Object} obj Заданный модифицируемый объект
 * @param {Array} path Массив ключей
 * @param {Object} opts Опции обработки объекта
 * @returns {null}
 * @private
 */
const createChildsFromKeysArr = (obj, path, opts) => {
    opts = opts || {}
    if (!path || path.length === 0) {
        return null
    }
    const key = path.shift()
    if (path.length === 0) {
        if (!obj.hasOwnProperty(key) || (opts.forceFill === true && opts.hasOwnProperty('fillValue'))) {
            obj[key] = opts.fillValue || null
        }
    } else {
        if (!obj.hasOwnProperty(key)) {
            obj[key] = {}
        }
        createChildsFromKeysArr(obj[key], path, opts)
    }
}

exports.createChildsFromKeysArr = createChildsFromKeysArr

/**
 * Создает на основе объекта, содержащего data-атрибуты, объект необходимой вложенности со структурой полей,
 * соответствующей namespace-структуре атрибутов
 * Например:
 *   > JSON.stringify(magickDataUnFlatten({"data-a-b-c":1,"data-a-d":2})['data'])
 *   output: {"a":{"b":{"c":1},"d":2}}
 *
 * @param arr
 * @param {Object} opts Опции обработки объекта
 * @returns {{}}
 * @private
 */
const magickDataUnFlatten = function (arr, opts) {
    const obj = {}
    opts = opts || {}
    Object.keys(arr || {}).forEach( (key) => {
        createChildsFromKeysArr(obj, key.split(opts.divider || '-'), {forceFill: true, fillValue: arr[key] || null})
    })
    return obj
}

exports.magickDataUnFlatten = magickDataUnFlatten

/**
 * Разбирает переданные через контекст или директ-коллом аргументы и возвращает объект
 *
 * @param ctx - Объект контекста
 * @param data
 * @returns {{}}|null
 */
const getCallArguments = (ctx, data) => {
    try {
        data =
            (typeof data).toLowerCase() === 'string'
                ? {p: data}
                : (data && (typeof data).toLowerCase() === 'object' && data.hasOwnProperty('query')
                ? {p: data.query}
                : (ctx.callbackQuery && ctx.callbackQuery.data.match(/^\{.*\}$/)
                    ? JSON.parse(ctx.callbackQuery.data) : null))
    } catch (e) {
        console.error(e)
    }
    return data
}

exports.getCallArguments = getCallArguments

/**
 * Разбирает массив объектов и возвращает хэш, в котором индексами является значение массива по заданному ключу
 * При совпадении индексов в хэш берется последний из элементов с одним и тем же значением заданного ключа
 *
 * @param arr - Массив объектов
 * @param key - Ключ объекта массива для индекса хэша
 * @returns {{}}|null
 */
const getHashFromObjectsArray = (arr, key) => {
    return arr.reduce((obj, item) => ({...obj, [item[key]]: item}) ,{});
}

exports.getHashFromObjectsArray = getHashFromObjectsArray;
