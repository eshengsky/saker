/**
 * Created by Sky on 2016/11/19.
 */
(function () {

    var editor1 = ace.edit("dataArea");
    editor1.session.setMode("ace/mode/javascript");
    editor1.setFontSize(13);
    editor1.renderer.setShowGutter(false);
    editor1.setHighlightActiveLine(false);
    editor1.clearSelection();
    editor1.focus();
    editor1.$blockScrolling = Infinity;

    var editor2 = ace.edit("tempArea");
    editor2.session.setMode("ace/mode/html");
    editor2.setFontSize(13);
    editor2.renderer.setShowGutter(false);
    editor2.setHighlightActiveLine(false);
    editor2.clearSelection();
    editor2.$blockScrolling = Infinity;

    var editor3 = ace.edit("resultArea");
    editor3.session.setMode("ace/mode/html");
    editor3.setFontSize(13);
    editor3.renderer.setShowGutter(false);
    editor3.setHighlightActiveLine(false);
    editor3.clearSelection();
    editor3.setReadOnly(true);
    editor3.$blockScrolling = Infinity;

    editor1.on('change', function () {
        renderView();
    });

    editor2.on('change', function () {
        renderView();
    });

    renderView();

    function renderView() {
        var data = editor1.getValue(),
            template = editor2.getValue(),
            html;

        try {
            data = eval('(' + data + ')');
        } catch (err) {
            editor3.setValue('Error in Data panel: ' + err.message);
            editor3.clearSelection();
            editor3.renderer.setStyle("err", true);
            return;
        }

        try {
            html = saker.compile(template)(data);
            editor3.setValue(html);
            editor3.session.setMode("ace/mode/html");
            editor3.clearSelection();
            editor3.renderer.unsetStyle("err", true)
        } catch (err) {
            editor3.setValue('Error in Template panel: ' + err.message);
            editor3.clearSelection();
            editor3.renderer.setStyle("err", true)
        }
    }
}());