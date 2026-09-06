class CatChErr {
    handleErr(fn){
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}

module.exports = {
    CatChErr: new CatChErr(0)
}