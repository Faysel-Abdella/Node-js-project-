const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 1;

exports.getProducts = (req, res, next) => {
  let totalItems;
  //extract a quer
  //if there is no query use page as 1
  const page = +req.query.page || 1;
  Product.find()
    .countDocuments()
    .then((numberOfProducts) => {
      totalItems = numberOfProducts;
      //coutDocuments gives us the total number of products
      return (
        Product.find()
          //skip the first 'n' terms and give me the rets
          .skip((page - 1) * ITEMS_PER_PAGE)
          //Only give me 2 items for every page
          .limit(ITEMS_PER_PAGE)
      );
    })
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "Products",
        path: "/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  let totalItems;
  //extract a quer
  //if there is no query use page as 1
  const page = +req.query.page || 1;
  Product.find()
    .countDocuments()
    .then((numberOfProducts) => {
      totalItems = numberOfProducts;
      //coutDocuments gives us the total number of products
      return (
        Product.find()
          //skip the first 'n' terms and give me the rets
          .skip((page - 1) * ITEMS_PER_PAGE)
          //Only give me 2 items for every page
          .limit(ITEMS_PER_PAGE)
      );
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  //In here i need to return that file
  const orderId = req.params.orderId;
  //check if this order belongs to the currently user, if not he can't download it
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        console.log("no order");
        return next(new Error("No order found."));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        console.log("no macthing");
        return next(new Error("Unauthorized"));
      }
      //Only if the above to tests is passed read and output the file
      const invoicName = "InVoice-" + orderId + ".pdf";
      const invoicPath = path.join("data", "invoices", invoicName);

      // ###### Create a new pdf on fly ####
      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoicName + '"'
      );
      // create write stream and forward the result to the res
      pdfDoc.pipe(fs.createWriteStream(invoicPath));
      pdfDoc.pipe(res);
      //write the the file content
      pdfDoc.fontSize(26).text("Invoices", {
        underline: true,
      });
      pdfDoc.text("-------------------");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(18)
          .text(
            prod.product.title +
              "-" +
              prod.quantity +
              "X" +
              "$" +
              prod.product.price
          );
      });
      pdfDoc.text("--------------------");
      pdfDoc.fontSize(22).text("Total Price: $" + totalPrice);

      //tell you have finished writing
      pdfDoc.end(); //When you say end(), the file will be saved and the response will be sent

      // console.log("the path", invoicPath);
      // fs.readFile(invoicPath, (err, fileContent) => {
      //   if (err) {
      //     console.log("reading error", err);
      //     return next(err);
      //     //By the above line the erroe handling middleware in app.js will
      //     //be excuted
      //   }
      //   res.setHeader("Content-Type", "application/pdf");
      //   res.setHeader(
      //     "Content-Disposition",
      //     'inline; filename="' + invoicName + '"'
      //   );

      //   res.send(fileContent);
      // });

      // const file = fs.createReadStream(invoicPath);
      // //readstream == read step-by-step, in different chunk

      // file.pipe(res);
      // //'pipe' is to forward the data readen by createReadStream to my response step by step
    })
    .catch((err) => {
      console.log("erro form b", err);
      next(err);
    });
};
