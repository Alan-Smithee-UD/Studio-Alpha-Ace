/*:
 * @target MZ
 * @plugindesc データベースの情報を複製したアクターを加入させるコマンドを提供する
 * @author アラン・スミシー
 * @url https://github.com/Alan-Smithee-UD/Studio-Alpha-Ace.git
 * @help 
 * プラグインコマンドによって、データベースの情報通りのアクターを加入させることができます。
 * すでにデータベースのアクター数と同数のアクターがゲーム内に生成されている場合はプラグインコマンドによる加入処理が失敗します。
 * 
 * 【プラグインコマンド】
 * ・複製体を加入させる（直接指定）
 * データベース上のアクターIDを指定し、その情報を持ったアクターをパーティに加入させます。
 * 
 * 【パラメータ】
 * ・処理結果スイッチ
 * プラグインコマンドの加入処理の実行後、加入処理が正常に行われていれば指定したスイッチがオン
 * 異常終了した場合は指定したスイッチがオフになります。
 * プラグインコマンドの加入処理のあとにこのスイッチで条件分岐を設けることで、エラーハンドリングができます。
 * 
 * ・処理結果変数
 * プラグインコマンドの加入処理の実行後、加入処理が正常に行われていれば指定した変数に加入したアクターのIDが代入されます。
 * 異常終了した場合は0が代入されます。
 * プラグインコマンドの加入処理のあとにこの変数で指定したアクターを操作することで、加入レベルを操作したりできます。
 * 
 * 【注意事項】
 * 当プラグインを使用する場合、原則として加入処理はすべて当プラグインのプラグインコマンドを使用してください。
 * 本来、別のアクターに使用されるはずだったアクターIDを、他アクターの複製体が乗っ取ってしまう場合があります。
 * 当プラグインはCreature Collector的な作品での運用を想定しています。
 * 
 * 【利用規約】
 * 当プラグインは著作権フリーとし、改変・再配布は自由に行うことができ、クレジットの表記も任意となります。
 * 
 * 【更新履歴】
 * ver1.0　公開
 * 
 * @param resultSw
 * @text 処理結果スイッチ
 * @desc 複製体の加入処理が正常終了したかの判定結果を反映するスイッチのIDです（0を設定で機能を使わない）
 * @type switch
 * @default 0
 * 
 * @param resultVar
 * @text 処理結果変数
 * @desc プラグインコマンドによって加入したアクターのアクターIDを格納する変数IDです（0を設定で機能を使わない）
 * @type variable
 * @default 0
 * 
 * @command duplicate
 * @text 複製体を加入させる（直接指定）
 * @desc アクターIDを指定して、そのアクターのデータベース上のパラメータを持った新しいアクターを加入させます
 *
 * @arg orgActor
 * @text 加入アクターID
 * @desc 加入させるアクターの複製元のIDを指定してください
 * @type actor
 * @default
 * 
 * 
 * @command duplicateVariable
 * @text 複製体を加入させる（変数で指定）
 * @desc アクターIDを指定して、そのアクターのデータベース上のパラメータを持った新しいアクターを加入させます
 *
 * @arg orgActorVal
 * @text 変数ID
 * @desc 加入させるアクターの複製元のIDが入った変数IDを指定してください
 * @type variable
 * @default 
 * 
 * @command releaseActor
 * @text アクターを逃がす（直接指定）
 * @desc アクターIDを指定して、そのアクターを完全にデータから消し去ります。
 *
 * @arg actorId
 * @text 消去アクターID
 * @desc 消去するアクターのIDを指定してください（複製先のIDです）
 * @type actor
 * @default
 * 
 * @command releaseActorVariable
 * @text アクターを逃がす（変数で指定）
 * @desc アクターIDを指定して、そのアクターを完全にデータから消し去ります。
 *
 * @arg actorId
 * @text 変数ID
 * @desc 消去するアクターのIDが入った変数IDを指定してください（複製先のIDです）
 * @type variable
 * @default
 * 
 */

(() => {
    const pluginName = decodeURIComponent(document.currentScript.src.split("/").pop().replace(/\.js$/, ""));
    const parameters = PluginManager.parameters(pluginName);
    const resultSwitchId = parameters.resultSw;
    const resultVariableId = parameters.resultVar;

    PluginManager.registerCommand(pluginName, "duplicate", args => {
        const original = args.orgActor;
        dupulicateActor(original);
    });

    PluginManager.registerCommand(pluginName, "duplicateVariable", args => {
        const original = $gameVariables.value(args.orgActorVal);
        dupulicateActor(original);
    });

    PluginManager.registerCommand(pluginName, "releaseActor", args => {
        const actorId = args.actorId;
        initializeActorData(actorId);
    });

    PluginManager.registerCommand(pluginName, "releaseActorVariable", args => {
        const actorId = $gameVariables.value(args.actorId);
        initializeActorData(actorId);
    });

    function dupulicateActor(originalActorId) {
        const newActorId = findNextAvailableActorId();
        if (newActorId) {
            $gameActors._data[newActorId] = new Game_Actor(1);
            $gameActors._data[newActorId].setup(originalActorId);
            $gameActors._data[newActorId]._actorId = newActorId;
            $gameParty.addActor(newActorId);
            $gameSwitches.setValue(resultSwitchId, true);
            $gameVariables.setValue(resultVariableId,newActorId);
        } else {
            $gameSwitches.setValue(resultSwitchId, false);
            $gameVariables.setValue(resultVariableId,0);
        }
    }

    function initializeActorData(actorId) {
        if ($gameParty._actors.includes(actorId)) {
            $gameParty.removeActor(actorId);
        }
        $gameActors._data[actorId] = undefined;
    }

    function findNextAvailableActorId() {
        let newId = 1; // 最初のコピー先のIDは1から開始
        while ($gameActors._data[newId]) {  // $gameActors._data でゲーム内のアクターを確認
            newId++;
        }

        // 利用可能なアクターIDが見つかった場合
        if (newId < $dataActors.length) {
            return newId;
        } else {
            console.error("利用可能なアクターIDがありません。");
            return null;
        }
    }
})();
