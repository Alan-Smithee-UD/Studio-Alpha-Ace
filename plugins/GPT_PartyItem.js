/*:
 * @target MZ
 * @plugindesc アイテムコマンドのパーティーコマンド化
 * @author chatGPT-4o & アラン・スミシー
 * @url https://github.com/Alan-Smithee-UD/Studio-Alpha-Ace.git
 * 
 * @help
 * このプラグインを導入すると、アクターコマンドからアイテムコマンドが削除され、代わりにパーティーコマンドにアイテムコマンドが追加されます
 * 
 * 【パラメータ】
 * ・アイテム使用アクターID
 * アイテムコマンドで選択したアイテムを使用するアクターです。必ずパーティーにいないアクターを設定してください。
 * 
 * 【注意事項】
 * アイテム決定フローについての処理を上書きしており、競合が発生するおそれがあります。
 * 余裕があれば対応しますが、基本的に競合のサポートはしませんのでご了承ください。
 * 
 * 【利用規約】
 * 当プラグインは著作権フリーとし、改変・再配布は自由に行うことができ、クレジットの表記も任意となります。
 * 
 * 【更新履歴】
 * ver1.0　公開
 * 
 * @param ItemUser
 * @type actor
 * @text アイテム使用アクターID
 * @desc パーティーコマンドでアイテムを使用するアクターを指定します。パーティー内にいる必要はありません（というかいないことを想定しています）
 * 
 */

(() => {
    const pluginName = "GPT_PartyItem";
    const parameters = PluginManager.parameters(pluginName);
    const itemUser = Number(parameters["ItemUser"] || 0);

// *********************************
//  BattleManagerにプロパティを追加  *
// *********************************

    // iItemSelection プロパティを追加
    BattleManager.itemSelection = null;
    // setter を追加
    BattleManager.setItemSelection = function (boolean) {
        this.itemSelection = boolean;
    };
    // getter を追加
    BattleManager.isItemSelection = function () {
        return this.itemSelection;
    };

    // reservedTarget プロパティを追加
    BattleManager.reservedTarget = null;
    // setter を追加
    BattleManager.setReservedTarget = function (number) {
        this.reservedTarget = number;
    };
    // getter を追加
    BattleManager.getReservedTarget = function () {
        return this.reservedTarget;
    };


    // reservedItem プロパティを追加
    BattleManager.reservedItem = null;
    // setter を追加
    BattleManager.setReservedItem = function (item) {
        this.reservedItem = item;
    };
    // getter を追加
    BattleManager.getReservedItem = function () {
        return this.reservedItem;
    };

    // 戦闘開始時に reservedItem、itemSelection を初期化
    const _BattleManager_setup = BattleManager.setup;
    BattleManager.setup = function (troopId, canEscape, canLose) {
        _BattleManager_setup.call(this, troopId, canEscape, canLose);
        this.reservedItem = null; // 初期化
        this.itemSelection = null; // 初期化
    };
    // 戦闘終了時に reservedItem、itemSelection を初期化
    const _BattleManager_endBattle = BattleManager.endBattle;
    BattleManager.endBattle = function (result) {
        _BattleManager_endBattle.call(this, result);
        this.reservedItem = null; // 初期化
        this.itemSelection = null; // 初期化
    };


    // パーティーコマンドにアイテムコマンドを追加
    const _Window_PartyCommand_makeCommandList = Window_PartyCommand.prototype.makeCommandList;
    Window_PartyCommand.prototype.makeCommandList = function () {
        _Window_PartyCommand_makeCommandList.call(this);
        this.addCommand(TextManager.item, "item");
    };

    // アクターコマンドからアイテムコマンドを削除
    const _Window_ActorCommand_makeCommandList = Window_ActorCommand.prototype.makeCommandList;
    Window_ActorCommand.prototype.makeCommandList = function () {
        _Window_ActorCommand_makeCommandList.call(this);
        this._list = this._list.filter(command => command.symbol !== "item");
    };

    // パーティーコマンドにアイテム選択の遷移設定
    const _Scene_Battle_createPartyCommandWindow = Scene_Battle.prototype.createPartyCommandWindow;
    Scene_Battle.prototype.createPartyCommandWindow = function () {
        _Scene_Battle_createPartyCommandWindow.call(this);
        this._partyCommandWindow.setHandler("item", this.commandPartyItem.bind(this));
        this.reservedItem = null;
    };

    // パーティーコマンドからアイテムを選択した際の処理
    Scene_Battle.prototype.commandPartyItem = function () {
        // アイテムウィンドウを表示・アクティブ化
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this)); // アイテム決定時の処理
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this)); // キャンセル時の処理
        this._itemWindow.refresh();
        this._itemWindow.show();
        this._itemWindow.activate();
    };

    // アイテム選択で決定キーを押した際の処理
    Scene_Battle.prototype.onItemOk = function () {
        const item = this._itemWindow.item();
        BattleManager.setReservedItem(item);
        const actor = $gameActors.actor(itemUser);
        const action = new Game_Action(actor);
        action.setItem(item.id);
        actor.setAction(0, action);
        BattleManager.setItemSelection(true); // アイテム選択状態フラグをON
        $gameParty.setLastItem(item);
        if (!action.needsSelection()) {
            BattleManager.selectNextActor();
        } else if (action.isForOpponent()) {
            this.startEnemySelection();
        } else {
            this.startActorSelection();
        }
    };

    // アイテム選択でキャンセルキーを押した際の処理
    Scene_Battle.prototype.onItemCancel = function () {
        this._itemWindow.hide();
        this._itemWindow.deactivate();
        this._partyCommandWindow.activate(); // 遷移先がパーティーコマンド
        BattleManager.setReservedItem(null); // アイテム選択をクリア
        BattleManager.setItemSelection(false); // アイテム選択状態フラグをクリア
    };

    // コマンドキャンセル時にアイテム選択をクリア
    const _Scene_Battle_commandCancel = Scene_Battle.prototype.commandCancel;
    Scene_Battle.prototype.commandCancel = function () {
        BattleManager.reservedItem = null;
        _Scene_Battle_commandCancel.call(this);
    };

    // アイテム選択状態ではプラグインパラメータで指定したアクターを参照する
    BattleManager.inputtingAction = function () {
        if (this.itemSelection) {
            return $gameActors.actor(itemUser) ? $gameActors.actor(itemUser).inputtingAction() : null;
        } else {
            return this._currentActor ? this._currentActor.inputtingAction() : null;
        }
    };

    // アクター選択時決定キー押下処理
    // アイテム選択状態フラグがONなら選択したアイテムを記録し、アイテム選択状態フラグをOFFにする
    const _Scene_Battle_onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function () {
        _Scene_Battle_onActorOk.call(this);
        if (BattleManager.itemSelection) {
            BattleManager.reservedTarget = this._actorWindow.index();
            BattleManager.setItemSelection(false);
        }
    }
    
    // エネミー選択時決定キー押下処理
    // アイテム選択状態フラグがONなら選択したアイテムを記録し、アイテム選択状態フラグをOFFにする
    const _Scene_Battle_onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function () {
        _Scene_Battle_onEnemyOk.call(this)
        if (BattleManager.itemSelection) {
            BattleManager.reservedTarget = this._enemyWindow.enemyIndex();
            BattleManager.setItemSelection(false);
        }
    };

    // ターン開始時処理
    const _BattleManager_startTurn = BattleManager.startTurn;
    BattleManager.startTurn = function () {
        _BattleManager_startTurn.call(this); // 通常のターン処理
        if (this.reservedItem) {
            // アイテムが予約されている場合、アクターにアクションを設定
            const actor = $gameActors.actor(itemUser);
            if (actor) {
                const action = new Game_Action(actor);
                action.setItem(this.reservedItem.id); // reservedItem を設定
                action.setTarget(this.reservedTarget);
                actor.setAction(0, action);

                // アクションを即座に実行
                this._subject = actor;
                this.processTurn();
            }
            this.reservedItem = null; // 使用後に予約をリセット
        }

    };

    // 対象選択時のキャンセルキー処理
    // アイテム選択状態フラグによって遷移先が変更される
    const _Scene_Battle_onActorCancel = Scene_Battle.prototype.onActorCancel
    Scene_Battle.prototype.onActorCancel = function () {
        if (BattleManager.itemSelection) {
            this._actorWindow.hide();
            this.commandPartyItem()
        } else {
            _Scene_Battle_onActorCancel.call(this);
        }
    };
    const _Scene_Battle_onEnemyCancel = Scene_Battle.prototype.onEnemyCancel
    Scene_Battle.prototype.onEnemyCancel = function () {
        if (BattleManager.itemSelection) {
            this._enemyWindow.hide();
            this._statusWindow.show();
            this.commandPartyItem()
        } else {
            _Scene_Battle_onEnemyCancel.call(this);
        }
    };

})();
