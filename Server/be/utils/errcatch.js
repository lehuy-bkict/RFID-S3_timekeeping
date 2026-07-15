class CatChErr {
    handleErr(fn){
        return (req, res, next) => {
            fn(req, res, next).catch(next)
            // try {
            //     fn(req, res, next);
            //   } catch (err) {
            //     next(err);
            //   }
        }
    }
}

module.exports = {
    CatChErr: new CatChErr(0)
}