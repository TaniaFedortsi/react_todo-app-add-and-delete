/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID } from './api/todos';
import * as todosService from './api/todos';
import { Todo } from './types/Todo';
import classNames from 'classnames';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

type ErrorMessage =
  | 'Unable to load todos'
  | 'Title should not be empty'
  | 'Unable to add a todo'
  | 'Unable to delete a todo'
  | 'Unable to update a todo'
  | null;

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [errorMessage, setErrorMessage] = useState<ErrorMessage>(null);
  const [loadingTodoId, setLoadingTodoId] = useState<number | null>(null);
  const [isAddind, setIsAdding] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = (todoId: number) => {
    return loadingTodoId === todoId;
  };

  const showErrorMessage = (error: ErrorMessage) => {
    setErrorMessage(error);
    setTimeout(() => {
      setErrorMessage(null);
    }, 3000);
  };

  useEffect(() => {
    todosService
      .getTodos()
      .then(setTodos)
      .catch(() => showErrorMessage('Unable to load todos'));
  }, []);

  useEffect(() => {
    if (!isAddind) {
      inputRef.current?.focus();
    }
  }, [isAddind]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!value.trim()) {
      showErrorMessage('Title should not be empty');

      return;
    }

    setIsAdding(true);

    const newTempTodo: Todo = {
      id: 0,
      userId: USER_ID,
      title: value.trim(),
      completed: false,
    };

    setTempTodo(newTempTodo);
    setLoadingTodoId(0);

    todosService
      .createTodo({
        userId: USER_ID,
        title: newTempTodo.title,
        completed: false,
      })
      .then(createdTodo => {
        setTodos(prev => [...prev, createdTodo]);
        setTempTodo(null);
        setValue('');
      })
      .catch(() => {
        setTempTodo(null);
        showErrorMessage('Unable to add a todo');
        setValue(newTempTodo.title);
      })
      .finally(() => {
        setLoadingTodoId(null);
        setIsAdding(false);
        setTimeout(() => inputRef.current?.focus(), 0);
      });
  };

  const removeTodo = (todoId: number) => {
    setLoadingTodoId(todoId);

    todosService
      .removeTodo(todoId)
      .then(() => {
        setTodos(prevTodos => prevTodos.filter(prev => prev.id !== todoId));
      })
      .catch(() => {
        showErrorMessage('Unable to delete a todo');
      })
      .finally(() => {
        setLoadingTodoId(null);
        inputRef.current?.focus();
      });
  };

  const handleUpdate = (
    event: React.FormEvent<HTMLFormElement>,
    id: number,
  ) => {
    event.preventDefault();

    if (!newTitle) {
      removeTodo(id);

      return;
    }

    setTodos(prevTodos =>
      prevTodos.map(prev =>
        prev.id === id ? { ...prev, title: newTitle } : prev,
      ),
    );

    setEditing(null);
  };

  const toggleCompleted = (id: number, checked: boolean) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: checked } : todo,
      ),
    );
  };

  const changeFilter = (newFilter: 'all' | 'active' | 'completed') => {
    setFilter(newFilter);
  };

  const completedTodos = todos.filter(todo => todo.completed);

  const clearCompletedTodo = () => {
    completedTodos.forEach(todo => todosService.removeTodo(todo.id));
    setTodos(prev => prev.filter(todo => !todo.completed));
  };

  const visibleTodos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className="todoapp__toggle-all active"
            data-cy="ToggleAllButton"
          />

          {/* Add a todo on form submit */}
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={value}
              onChange={event => setValue(event.target.value)}
              disabled={isAddind}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          <TransitionGroup>
            {visibleTodos.map(todo => (
              <CSSTransition key={todo.id} timeout={300} classNames="item">
                <div
                  data-cy="Todo"
                  className={classNames('todo', { completed: todo.completed })}
                >
                  <label className="todo__status-label">
                    <input
                      data-cy="TodoStatus"
                      type="checkbox"
                      className="todo__status"
                      checked={todo.completed}
                      onChange={event =>
                        toggleCompleted(todo.id, event.target.checked)
                      }
                    />
                  </label>

                  {editing === todo.id ? (
                    <form onSubmit={event => handleUpdate(event, todo.id)}>
                      <input
                        data-cy="TodoTitleField"
                        type="text"
                        className="todo__title-field"
                        placeholder="Empty todo will be deleted"
                        value={newTitle}
                        onChange={event => setNewTitle(event?.target.value)}
                      />
                    </form>
                  ) : (
                    <span
                      data-cy="TodoTitle"
                      className="todo__title"
                      onDoubleClick={() => {
                        setEditing(todo.id);
                        setNewTitle(todo.title);
                      }}
                    >
                      {todo.title}
                    </span>
                  )}

                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => removeTodo(todo.id)}
                    disabled={isLoading(todo.id)}
                  >
                    ×
                  </button>

                  <div
                    data-cy="TodoLoader"
                    className={classNames('modal overlay', {
                      'is-active': isLoading(todo.id),
                    })}
                  >
                    <div className="modal-background has-background-white-ter " />
                    <div className="loader" />
                  </div>
                </div>
              </CSSTransition>
            ))}

            {tempTodo && (
              <CSSTransition key={0} timeout={300} classNames="temp-item">
                <div data-cy="Todo" className="todo">
                  <label className="todo__status-label">
                    <input type="checkbox" className="todo__status" disabled />
                  </label>

                  <span data-cy="TodoTitle" className="todo__title">
                    {tempTodo.title}
                  </span>

                  <button type="button" className="todo__remove" disabled>
                    ×
                  </button>

                  <div data-cy="TodoLoader" className="modal overlay is-active">
                    <div className="modal-background has-background-white-ter" />
                    <div className="loader" />
                  </div>
                </div>
              </CSSTransition>
            )}
          </TransitionGroup>
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(todo => !todo.completed).length} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                onClick={() => changeFilter('all')}
                className={classNames('filter__link', {
                  selected: filter === 'all',
                })}
                data-cy="FilterLinkAll"
              >
                All
              </a>

              <a
                href="#/active"
                onClick={() => changeFilter('active')}
                className={classNames('filter__link', {
                  selected: filter === 'active',
                })}
                data-cy="FilterLinkActive"
              >
                Active
              </a>

              <a
                href="#/completed"
                onClick={() => changeFilter('completed')}
                className={classNames('filter__link', {
                  selected: filter === 'completed',
                })}
                data-cy="FilterLinkCompleted"
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              onClick={() => clearCompletedTodo()}
              disabled={completedTodos.length === 0}
            >
              Clear completed
            </button>
          </footer>
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: errorMessage === null },
        )}
      >
        <button data-cy="HideErrorButton" type="button" className="delete" />
        {errorMessage}
      </div>
    </div>
  );
};
