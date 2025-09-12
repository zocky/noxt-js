const eventSource = new EventSource('/_events');
let reload = false;
eventSource.addEventListener('connected', () => {
  if (reload) {
    console.log('%c Reloading... ','color: #ffd; background-color: #080');
    window.location.reload();
  } else {
    console.log('%c Connected ', 'color: #ffd; background-color: #080' );
  }

});
eventSource.addEventListener('reload', () => {
    console.log('%c Restarting... ','color: #ffd; background-color: #080');
  reload = true;
});