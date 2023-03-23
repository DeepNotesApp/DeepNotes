export function useWindowResizeListener() {
  onMounted(() => {
    onResize();

    window.addEventListener('resize', onResize);
  });

  function onResize() {
    if (
      window.innerWidth < 1080 &&
      uiStore().leftSidebarExpanded &&
      uiStore().rightSidebarExpanded
    ) {
      mainLogger()
        .sub('useWindowResizeListener')
        .info('Collapse right sidebar');

      uiStore().rightSidebarExpanded = false;
    }
  }

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize);
  });
}
