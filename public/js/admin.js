//This run in the client
const deleteProduct = (btn) => {
  //btn is the button element passed in products.ejs
  const prodId = btn.parentNode.querySelector("[name=productId]").value;
  const csrf = btn.parentNode.querySelector("[name=_csrf]").value;

  const productElement = btn.closest("article");
  //using the above infos we can send async req to the server

  fetch("/admin/product/" + prodId, {
    method: "DELETE",
    headers: {
      "csrf-token": csrf,
    },
  })
    .then((result) => {
      return result.json();
    })
    .then((data) => {
      //after deleting from database delete from view
      productElement.parentNode.removeChild(productElement);
    })
    .catch((err) => console.log(err));
};
