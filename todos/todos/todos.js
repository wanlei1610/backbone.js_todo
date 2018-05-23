$(function () {

    /**
     *基本的Todo模型，属性为：content,order,done。
     **/
    var Todo = Backbone.Model.extend({
        // 设置默认的属性需要提醒的是，在 Javascript 中，对象是按引用传值的，
        // 因此如果包含一个对象作为默认值，它会被所有实例共享。可以定义 defaults为一个函数取代。
        defaults: function () {
            return {
                content: "empty todo...",
                order: Todos.nextOrder(),
                done: false
            };
        },
        // 设置任务完成状态
        toggle: function () {
            this.save({done: !this.get("done")});
        }
    });

    /**
     *Todo的一个集合，数据通过localStorage存储在本地。
     **/

    var TodoList = Backbone.Collection.extend({

        // 设置Collection的模型为Todo
        model: Todo,
        //存储到浏览器，以todos_backbone命名的空间中
        //此函数为Backbone插件提供
        localStorage: new Backbone.LocalStorage("todos_backbone"),

        //获取所有已经完成的任务数组
        //where(attributes)
        //返回集合中所有匹配所传递 attributes（属性）的模型数组。
        //对于简单的filter（过滤）比较有用。
        done: function () {
            return this.where({done: true});
        },

        //获取任务列表中未完成的任务数组

        remaining: function () {
            return this.where({done: false});
        },

        //获得下一个任务的排序序号，对数据库记录数加1。
        nextOrder: function () {
            if (!this.length) return 1;

            // last获取collection中最后一个元素
            return this.last().get('order') + 1;
        },

        //Backbone内置属性，指明collection的排序规则。
        comparator: 'order'
    });

    // 首先是创建一个全局的Todo的collection对象

    var Todos = new TodoList;

// 先来看TodoView，作用是控制任务列表
    var TodoView = Backbone.View.extend({

        //下面这个标签的作用是，把template模板中获取到的html代码放到这标签中。
        // 如果你指定了 tagName，那么，生成的 View 以该 TagName 为最顶上节点标签。
        //如果你指定了 className，那么 tagName 的 className 为你指定的 class
        tagName: "li",

        // 获取一个任务条目的模板,缓存到这个属性上。
        template: _.template($('#item_template').html()),

        // 为每一个任务条目绑定事件
        events: {
            "click .toggle": "toggleDone",
            "dblclick .view": "edit",
            "click a.destroy": "clear",
            "keypress .edit": "updateOnEnter",
            "blur .edit": "close"
        },

        //在初始化时设置对model的change事件的监听
        //设置对model的destroy的监听，保证页面数据和model数据一致
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
            //这个remove是view的中的方法，用来清除页面中的dom
            this.listenTo(this.model, 'destroy', this.remove);
        },

        // 渲染todo中的数据到 item_template 中，然后返回对自己的引用this
        //重载本函数可以实现从模型数据渲染视图模板，并可用新的 HTML 更新 this.el。
        //推荐的做法是在 render 函数的末尾 return this 以开启链式调用。
        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            this.$el.toggleClass('done', this.model.get('done'));
            this.input = this.$('.edit');
            return this;
        },

        // 控制任务完成或者未完成
        toggleDone: function () {
            this.model.toggle();
        },

        // 修改任务条目的样式
        edit: function () {
            $(this.el).addClass("editing");
            this.input.focus();
        },

        // 关闭编辑模式，并把修改内容同步到Model和界面
        close: function () {
            var value = this.input.val();
            if (!value) {
                //无值内容直接从页面清除
                this.clear();
            } else {
                this.model.save({content: value});
                this.$el.removeClass("editing");
            }
        },

        // 按下回车之后，关闭编辑模式
        updateOnEnter: function (e) {
            if (e.keyCode == 13) this.close();
        },

        // 移除对应条目，以及对应的数据对象
        clear: function () {
            this.model.destroy();
        }
    });

    //以及任务的添加。主要是整体上的一个控制
    var AppView = Backbone.View.extend({

        //绑定页面上主要的DOM节点
        el: $("#todoApp"),

        // 在底部显示的统计数据模板
        statsTemplate: _.template($('#stats_template').html()),

        // 绑定dom节点上的事件
        events: {
            "keypress #newTodo": "createOnEnter",
            "click #clearCompleted": "clearCompleted",
            "click #toggleAll": "toggleAllComplete"
        },

        //在初始化过程中，绑定事件到Todos上，
        //当任务列表改变时会触发对应的事件。
        //最后从localStorage中fetch数据到Todos中。
        initialize: function () {
            this.input = this.$("#newTodo");
            this.allCheckbox = this.$("#toggleAll")[0];

            this.listenTo(Todos, 'add', this.addOne);
            this.listenTo(Todos, 'reset', this.addAll);
            this.listenTo(Todos, 'all', this.render);

            this.footer = this.$('footer');
            this.main = $('#main');

            Todos.fetch();
        },

        // 更改当前任务列表的状态
        render: function () {
            var done = Todos.done().length;
            var remaining = Todos.remaining().length;

            if (Todos.length) {
                this.main.show();
                this.footer.html(this.statsTemplate({done: done, remaining: remaining}));
                this.footer.show();
            } else {
                this.main.hide();
                this.footer.hide();
            }

            //根据剩余多少未完成确定标记全部完成的checkbox的显示
            this.allCheckbox.checked = !remaining;
            console.log(remaining);
            console.log(this.allCheckbox.checked);
        },

        // 添加一个任务到页面id为todo_list的div/ul中
        addOne: function (todo) {
            var view = new TodoView({model: todo});
            this.$("#todoList").append(view.render().el);
        },

        // 把Todos中的所有数据渲染到页面,页面加载的时候用到
        addAll: function () {
            Todos.each(this.addOne, this);
        },

        //创建一个任务的方法，使用backbone.collection的create方法。
        //将数据保存到localStorage,这是一个html5的js库。
        //需要浏览器支持html5才能用。
        createOnEnter: function (e) {
            if (e.keyCode != 13) return;
            if (!this.input.val()) return;

            //创建一个对象之后会在backbone中动态调用Todos的add方法
            //该方法已绑定addOne。
            Todos.create({content: this.input.val()});
            this.input.val('');
        },

        //去掉所有已经完成的任务
        clearCompleted: function () {
            // 调用underscore.js中的invoke方法
            //对过滤出来的todos调用destroy方法
            _.invoke(Todos.done(), 'destroy');
            return false;

            //_.invoke(list, method, *args)语法
            //list可以为数组，对象，字符串和arguments
            // method是一个方法，可为方法名，也可为自定义方法
            //*args是无穷个参数
            //http://www.cnblogs.com/kyo4311/p/5172827.html
        },

        //处理页面点击标记全部完成按钮
        //处理逻辑：
        //    如果标记全部按钮已选，则所有都完成
        //    如果未选，则所有的都未完成。
        toggleAllComplete: function () {
            var done = this.allCheckbox.checked;
            Todos.each(function (todo) {
                todo.save({'done': done});
            });
        }
    });

    var App = new AppView;

});