Number.prototype.toTime = function(isSec) {
    var ms = isSec ? this * 1e3 : this,
        lm = ~(4 * !!isSec),  /* limit fraction */
        fmt = new Date(ms).toISOString().slice(11, lm);

    if (ms >= 8.64e7) {  /* >= 24 hours */
        var parts = fmt.split(/:(?=\d{2}:)/);
        parts[0] -= -24 * (ms / 8.64e7 | 0);
        return parts.join(':');
    }

    return fmt;
};
const arrAvg = arr => arr.reduce((a,b) => a + b, 0) / arr.length;

$(document).ready(function() {
    var riders = {}
    var refreshLaps = setInterval(getLaps, 5000)
    $('select').on('change', function() {
      $('#rider_name').val(riders[this.value]);
    });
    $("#slider").change(function() {
        if(this.checked) {
            refreshLaps = setInterval(getLaps, 5000)
        } else {
            clearInterval(refreshLaps)
        }
    });

    $('#save_rider').on('click', function() {
        var id = $('#riders').children("option:selected").val()
        var newName = $('#rider_name').val();
        updateRider(id,newName)
    });

    $('#deleteAllLaps').on('click', function() {
        $.post("/py-laptimer/lapData/_remove", {'safe': 0}, function(res){
            console.log(res)
            getLaps()
        })
    });

    function updateRider(rfid, name){
        var update = {
            'safe':0,
            'criteria':'{"rfid":"'+rfid+'"}',
            'newobj':'{"$set":{"name":"'+name+'"}}'
        }
        $.post("/py-laptimer/lapData/_update", update, function(res){
            console.log(res)
            getLaps()
        })
    }
        
    function getLaps(){
        riders = {}
        $('#riders').empty();
        $.get("/py-laptimer/lapData/_find", function(data){
            var tableData = []
            var best_laps = []
            var option = '';
            if(data.results.length > 0){
                for (var i = 0; i < data.results.length; i++){
                    var total_laps = data.results[i].laps.length
                    var last_lap = data.results[i].laps[total_laps-1]
                    var best_lap = Math.min(...data.results[i].laps)
                    best_laps.push({'loc':i,'lap':best_lap})
                    var rider_name = data.results[i].name ? data.results[i].name : 'Not Assigned'
                    riders[data.results[i].rfid] = rider_name
                    tableData.push([rider_name, data.results[i].rfid, data.results[i].laps.length, arrAvg(data.results[i].laps).toTime(), last_lap.toTime(), best_lap.toTime()])
                    option += '<option value="'+ data.results[i].rfid + '">' + data.results[i].rfid + '</option>';
                }

                var best_laps_sorted = best_laps.sort((a, b) => (a.lap > b.lap) ? 1 : -1)
                var fastest = best_laps_sorted[0]['lap']
                best_laps_sorted.forEach(function(blap){
                    var diff = blap['lap']-fastest
                    tableData[blap['loc']].push(diff.toTime())
                });
            }
            $('#riders').append(option);
            $('#example').DataTable( {
                "destroy":true,
                "columns":[
                    {title:"Name"},
                    {title:"RFID"},
                    {title:"Laps"},
                    {title:"Average"},
                    {title:"Last"},
                    {title:"Best"},
                    {title:"Diff +/-"},
                ],
                "data" : tableData,
                "order": [[ 6, "asc" ]],
                "searching": false,
                //"paging": false,
            });
        })
    }
    getLaps();
});