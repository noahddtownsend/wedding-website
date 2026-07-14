jQuery(document).ready(function () {
    const acc = document.getElementsByClassName('accordion-item');
    for (let i = 0; i < acc.length; i++) {
        const content = acc[i].getElementsByClassName('accordion-content')[0];
        acc[i].getElementsByClassName('accordion-header')[0].addEventListener('click', function () {
            this.classList.toggle('activeHeader');
            content.classList.toggle('activeContent');
        });
    }

    $('#heroContainer').mousemove(function (e) {
        const docWidth = $(document).width();

        if (docWidth === 0) {
            return;
        }

        let leftWidth = ((e.pageX + 15) / docWidth) * 100;

        if (leftWidth > 100) {
            leftWidth = 100
        } else if (leftWidth < 0) {
            leftWidth = 0
        }

        const rightWidth = 100 - leftWidth;
        $('#leftHeroContainer').css({width: leftWidth + "vw"});
        $('#rightHeroContainer').css({width: rightWidth + "vw"});
        $('#andDragger').css({left: leftWidth + "vw"})
    });
});