document.getElementById("contactForm").addEventListener("submit", checkForm);

function checkForm(event) {
  event.preventDefault(); // フォームのページ遷移を防ぐ

  // 要素取得
  const inputName = document.getElementById("name");
  const inputEmail = document.getElementById("email");
  const inputMessage = document.getElementById("message");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const messageError = document.getElementById("messageError");
  const successMsg = document.getElementById("successMessage");

  // エラーリセット
  nameError.textContent = "";
  emailError.textContent = "";
  messageError.textContent = "";
  inputName.classList.remove("is-error");
  inputEmail.classList.remove("is-error");
  inputMessage.classList.remove("is-error");

  // バリデーション
  let isValid = true;

  if (inputName.value === "") {
    nameError.textContent = "名前が未入力です。";
    inputName.classList.add("is-error");
    isValid = false;
  }

  if (inputEmail.value === "") {
    emailError.textContent = "メールアドレスが未入力です。";
    inputEmail.classList.add("is-error");
    isValid = false;
  }

  if (inputMessage.value.length < 5) {
    messageError.textContent = "5文字以上入力してください。";
    inputMessage.classList.add("is-error");
    isValid = false;
  }

  if (!isValid) {
    return;
}

// Formspree に送信
fetch("https://formspree.io/f/xldbzpre", {
    method: "POST",
    headers: {
      'Accept': 'application/json'
    },
    body: new FormData(document.getElementById("contactForm"))
  })
    .then(response => {
      if (response.ok) {
        document.getElementById("contactForm").style.display = "none";
        successMsg.textContent = "送信ありがとうございました！";
        successMsg.style.display = "block";

        setTimeout(() => {
          successMsg.textContent = ""; // 一定時間後に実行したい処理
          successMsg.style.display = "none";
        }, 3000); // ミリ秒。「3秒後に消したい」ときは 3000ミリ秒
      } else {
        alert("送信に失敗しました。しばらくしてから再度お試しください。");
      }
    })
    .catch(error => {
      alert("エラーが発生しました：" + error.message);
    });
}


//制作実績のアコーディオンメニュー
const accordionTitles = document.querySelectorAll('.accordion__title');

accordionTitles.forEach(title => {
  title.addEventListener('click', () => {
    const content = title.nextElementSibling;
    content.classList.toggle('open');
    title.classList.toggle('open');
  });
});
