(function() {
  var linksBtn = document.getElementById('js-linksBtn');
  var dropdownMenu = document.getElementById('js-dropdownMenu');
  linksBtn.onclick = function(e) {
    e.preventDefault();
    if(dropdownMenu.style.display === 'block') {
      dropdownMenu.style.display = 'none';
    } else {
      dropdownMenu.style.display = 'block';
    }
  };
})();
