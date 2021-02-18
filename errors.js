const errors = [

    // Base model
    { code: 1001, message: 'Wrong or undefined apiPath' },
    { code: 1002, message: 'Exception caught in model Base::findById()' },
    { code: 1003, message: 'Exception caught in model Base::search()' },
    { code: 1004, message: 'Exception caught in model Base::save()' },
    
    // Goal model
    { code: 1103, message: 'Exception caught in model Goal::findByUser()' }
]

module.exports.getByCode = (code) => {
    const ret = errors.filter(err => err.code === code)
    return ret[0] || null
}